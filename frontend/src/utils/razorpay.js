let razorpayLoadPromise

export function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(true)
  if (razorpayLoadPromise) return razorpayLoadPromise

  razorpayLoadPromise = new Promise((resolve, reject) => {
    let script = document.querySelector('script[data-razorpay-checkout]')
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.dataset.razorpayCheckout = 'true'
      document.body.appendChild(script)
    }

    script.addEventListener('load', () => window.Razorpay ? resolve(true) : reject(new Error('Razorpay Checkout did not initialize.')), { once: true })
    script.addEventListener('error', () => {
      script.remove()
      reject(new Error('Razorpay Checkout failed to load. Check your internet connection.'))
    }, { once: true })
  }).catch((error) => {
    razorpayLoadPromise = null
    throw error
  })

  return razorpayLoadPromise
}