const crypto = require("crypto");
const LiveClass = require("../models/liveClass");
const Enrollment = require("../models/enrollment");
const LiveAttendance = require("../models/liveAttendance");
const User = require("../models/user");
const { getRedisClient } = require("../config/redis");
const { getKafkaProducer, getKafkaConsumer, getAttendanceTopic } = require("../config/kafka");

const activeStudents = new Map();
const activeTtlSeconds = 24 * 60 * 60;

function redisPresenceKey(classId, email) {
    return `live-class:${classId}:student:${encodeURIComponent(email.toLowerCase())}`;
}

async function isEnrolled(email, courseId) {
    const redis = getRedisClient();
    const cacheKey = `enrollment:${encodeURIComponent(email.toLowerCase())}:${encodeURIComponent(courseId)}`;

    if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached !== null) return cached === "1";
    }

    const enrollmentExists = Boolean(await Enrollment.exists({
        student_email: email,
        course_id: courseId,
        status: "active"
    }));

    if (redis) {
        await redis.set(cacheKey, enrollmentExists ? "1" : "0", "EX", enrollmentExists ? 30 : 5);
    }

    return enrollmentExists;
}

async function getLiveClassSnapshot(classId) {
    const redis = getRedisClient();
    const cacheKey = `live-class:${classId}:metadata`;

    if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
    }

    const liveClass = await LiveClass.findOne({ class_id: classId })
        .select("class_id course_id room_name title course_title status")
        .lean();
    if (liveClass && redis) await redis.set(cacheKey, JSON.stringify(liveClass), "EX", 10);
    return liveClass;
}

async function getStudentDisplayName(email, tokenName) {
    if (tokenName) return tokenName;

    const redis = getRedisClient();
    const cacheKey = `student-name:${encodeURIComponent(email.toLowerCase())}`;
    if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) return cached;
    }

    const student = await User.findOne({ email }).select("name").lean();
    const name = student?.name || email;
    if (redis) await redis.set(cacheKey, name, "EX", 300);
    return name;
}

async function invalidateLiveClassSnapshot(classId) {
    const redis = getRedisClient();
    if (redis) await redis.del(`live-class:${classId}:metadata`);
}

async function saveAttendanceEvent(event) {
    const filter = { class_id: event.class_id, student_email: event.student_email };

    if (event.event_type === "joined") {
        await LiveAttendance.updateOne(filter, {
            $set: {
                student_name: event.student_name,
                left_at: null,
                status: "present"
            },
            $setOnInsert: {
                entered_at: new Date(event.entered_at),
                duration_minutes: 0
            }
        }, { upsert: true });
        return;
    }

    const enteredAt = new Date(event.entered_at).getTime();
    const leftAt = new Date(event.occurred_at);
    const duration = Number.isFinite(enteredAt)
        ? Math.max(0, Math.round((leftAt.getTime() - enteredAt) / 60000))
        : 0;

    await LiveAttendance.updateOne(filter, {
        $set: {
            left_at: leftAt,
            duration_minutes: duration,
            status: "present"
        }
    });
}

async function publishAttendanceEvent(event) {
    const producer = getKafkaProducer();
    if (!producer) return saveAttendanceEvent(event);

    try {
        await producer.send({
            topic: getAttendanceTopic(),
            acks: -1,
            messages: [{
                key: `${event.class_id}:${event.student_email}`,
                value: JSON.stringify(event)
            }]
        });
    } catch (error) {
        if (event.event_type === "joined") {
            const redis = getRedisClient();
            if (redis) await redis.del(redisPresenceKey(event.class_id, event.student_email));
            else activeStudents.delete(`${event.class_id}:${event.student_email}`);
        }
        throw error;
    }
}

async function joinLiveClass({ classId, studentEmail, studentName }) {
    const email = studentEmail.toLowerCase();
    const redis = getRedisClient();
    const key = redisPresenceKey(classId, email);
    const enteredAt = new Date();
    let added = false;

    if (redis) {
        added = (await redis.set(key, enteredAt.toISOString(), "EX", activeTtlSeconds, "NX")) === "OK";
    } else {
        const memoryKey = `${classId}:${email}`;
        added = !activeStudents.has(memoryKey);
        if (added) activeStudents.set(memoryKey, enteredAt.toISOString());
    }

    if (added) {
        try {
            await publishAttendanceEvent({
                event_id: crypto.randomUUID(),
                event_type: "joined",
                class_id: classId,
                student_email: email,
                student_name: studentName,
                entered_at: enteredAt.toISOString(),
                occurred_at: enteredAt.toISOString()
            });
        } catch (error) {
            if (redis) await redis.del(key);
            else activeStudents.delete(`${classId}:${email}`);
            throw error;
        }
    }
}

async function leaveLiveClass({ classId, studentEmail }) {
    const email = studentEmail.toLowerCase();
    const redis = getRedisClient();
    const key = redisPresenceKey(classId, email);
    let enteredAt;

    if (redis) {
        enteredAt = await redis.eval(
            "local value = redis.call('GET', KEYS[1]); if value then redis.call('DEL', KEYS[1]); end; return value",
            1,
            key
        );
    } else {
        const memoryKey = `${classId}:${email}`;
        enteredAt = activeStudents.get(memoryKey);
        activeStudents.delete(memoryKey);
    }

    if (!enteredAt) return;

    await publishAttendanceEvent({
        event_id: crypto.randomUUID(),
        event_type: "left",
        class_id: classId,
        student_email: email,
        entered_at: enteredAt,
        occurred_at: new Date().toISOString()
    });
}

async function startAttendanceConsumer() {
    const consumer = getKafkaConsumer();
    if (!consumer) return;

    await consumer.run({
        eachMessage: async ({ message }) => {
            if (!message.value) return;
            await saveAttendanceEvent(JSON.parse(message.value.toString()));
        }
    });
}

module.exports = {
    isEnrolled,
    getLiveClassSnapshot,
    getStudentDisplayName,
    invalidateLiveClassSnapshot,
    joinLiveClass,
    leaveLiveClass,
    startAttendanceConsumer
};