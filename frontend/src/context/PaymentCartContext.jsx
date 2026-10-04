import { createContext, useContext, useEffect, useState } from 'react'

const PaymentCartContext = createContext(null)
const STORAGE_KEY = 'uniskill_payment_cart'

function readStoredCart() {
  try {
    const cart = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(cart) ? cart.filter((item) => item?.course_id) : []
  } catch {
    return []
  }
}

export function PaymentCartProvider({ children }) {
  const [items, setItems] = useState(readStoredCart)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addCourse = (courseId) => {
    setItems((current) => current.some((item) => item.course_id === courseId)
      ? current
      : [...current, { course_id: courseId, plan_type: 'monthly', coupon_code: '' }])
  }

  const updateCourse = (courseId, changes) => {
    setItems((current) => current.map((item) => item.course_id === courseId ? { ...item, ...changes } : item))
  }

  const removeCourse = (courseId) => setItems((current) => current.filter((item) => item.course_id !== courseId))
  const clearCart = () => setItems([])

  return (
    <PaymentCartContext.Provider value={{ items, addCourse, updateCourse, removeCourse, clearCart }}>
      {children}
    </PaymentCartContext.Provider>
  )
}

export function usePaymentCart() {
  const context = useContext(PaymentCartContext)
  if (!context) throw new Error('usePaymentCart must be used within PaymentCartProvider.')
  return context
}