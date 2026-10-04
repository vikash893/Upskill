const assert = require('assert');
const jwt = require('jsonwebtoken');
const envConfig = require('../../../shared/config/env.config');
const permissionService = require('../services/permission.service');
const recordingService = require('../services/recording.service');
const { generateClassId, generateRecordingId } = require('../utils/classId');

async function runTests() {
    console.log('----------------------------------------------------');
    console.log('Running Scalable Live Classroom Unit & Integration Tests');
    console.log('----------------------------------------------------');

    const mockHostUser = { id: '507f1f77bcf86cd799439011', _id: '507f1f77bcf86cd799439011', email: 'teacher@uniskill.in', role: 'TEACHER' };
    const mockStudentUser = { id: '507f1f77bcf86cd799439022', _id: '507f1f77bcf86cd799439022', email: 'student@uniskill.in', role: 'STUDENT' };
    
    const mockClass = {
        classId: 'cls_test_123',
        title: 'System Design 101',
        hostId: '507f1f77bcf86cd799439011',
        hostEmail: 'teacher@uniskill.in',
        status: 'live'
    };

    // 1. Permission Unit Tests
    console.log('[TEST 1] Host permission verification for Host User...');
    const isHostRes = permissionService.isHost(mockHostUser, mockClass);
    assert.strictEqual(isHostRes, true, 'isHost should return true for host user');
    const hostCanStart = permissionService.canStartRecording(mockHostUser, mockClass);
    assert.strictEqual(hostCanStart, true, 'Host should be authorized to start recording');
    console.log('  -> PASSED');

    console.log('[TEST 2] Student permission enforcement (Must reject student starting recording)...');
    try {
        permissionService.canStartRecording(mockStudentUser, mockClass);
        assert.fail('Student should NOT be permitted to start recording');
    } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Should return 403 Forbidden');
        console.log(`  -> PASSED (${err.message})`);
    }

    console.log('[TEST 3] Host control participant authorization for Host...');
    const canControl = permissionService.canControlParticipant(mockHostUser, mockClass, mockStudentUser.id);
    assert.strictEqual(canControl, true, 'Host should be able to control participants');
    console.log('  -> PASSED');

    console.log('[TEST 4] Student control participant authorization (Must reject student controlling others)...');
    try {
        permissionService.canControlParticipant(mockStudentUser, mockClass, mockHostUser.id);
        assert.fail('Student should NOT be permitted to control participants');
    } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Should return 403 Forbidden');
        console.log(`  -> PASSED (${err.message})`);
    }

    // 2. Class ID Generator Utility Tests
    console.log('[TEST 5] Class ID generation format...');
    const classId = generateClassId();
    assert.ok(classId.startsWith('cls_'), 'Class ID should start with cls_');
    console.log(`  -> PASSED (Generated: ${classId})`);

    const recordingId = generateRecordingId(classId);
    assert.ok(recordingId.startsWith(`rec_${classId}_`), 'Recording ID format check');
    console.log(`  -> PASSED (Generated: ${recordingId})`);

    // 3. JWT Token Authentication Verification
    console.log('[TEST 6] JWT Token sign & verify cycle...');
    const token = jwt.sign(mockHostUser, envConfig.JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, envConfig.JWT_SECRET);
    assert.strictEqual(decoded.email, mockHostUser.email, 'Decoded token email match');
    console.log('  -> PASSED');

    console.log('----------------------------------------------------');
    console.log('ALL SCALABLE LIVE CLASSROOM TESTS PASSED CLEANLY! ✅');
    console.log('----------------------------------------------------');
}

if (require.main === module) {
    runTests().catch((err) => {
        console.error('TEST SUITE FAILED:', err);
        process.exit(1);
    });
}

module.exports = runTests;
