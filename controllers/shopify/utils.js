/**
 * Handle response formatting for different request types (HTML/JSON)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {boolean} success - Whether the operation was successful
 * @param {string} message - Response message
 * @param {Object} data - Additional data to include in the response
 * @returns {Object} - Express response
 */
function handleResponse(req, res, success, message, data = {}) {
    // If it's a GET request, return HTML
    if (req.method === 'GET') {
      if (success) {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Loyalty Points Redeemed</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; text-align: center; background-color: #f9f9f9; }
              .card { border: 1px solid #ddd; padding: 20px; max-width: 500px; margin: 0 auto; border-radius: 8px; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .code { font-size: 24px; font-weight: bold; padding: 15px; border: 2px dashed #4CAF50; margin: 20px 0; background-color: #f5f5f5; }
              .timer { font-weight: bold; color: #d44; }
              button { background-color: #4CAF50; color: white; border: none; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 10px 2px; cursor: pointer; border-radius: 4px; }
              .expiry-warning { color: #d44; margin-top: 15px; font-size: 14px; }
              .instructions { text-align: left; margin-top: 20px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; }
              .instructions ol { margin-left: 20px; padding-left: 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Success! Points Redeemed</h1>
              <p>You've redeemed ${data.pointsRedeemed} points for a ₹${data.pointsRedeemed} discount.</p>
              <p>Use this discount code during checkout:</p>
              <div class="code">${data.discountCode}</div>
              <p>This code expires in <span class="timer" id="countdown">15:00</span></p>
              <button onclick="copyCode()">Copy Code</button>
              <p class="expiry-warning">⚠️ This discount is valid only for your current cart and will expire in 15 minutes.</p>
              
              <div class="instructions">
                <p><strong>What to do next:</strong></p>
                <ol>
                  <li>Copy your discount code</li>
                  <li>Return to your cart</li>
                  <li>Proceed to checkout</li>
                  <li>Apply the code in the discount field</li>
                  <li>Complete your purchase</li>
                </ol>
              </div>
            </div>
            
            <script>
              function copyCode() {
                const text = "${data.discountCode}";
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(text).then(function() {
                    alert('Discount code copied!');
                  }, function() {
                    fallbackCopy();
                  });
                } else {
                  fallbackCopy();
                }
                
                function fallbackCopy() {
                  const textArea = document.createElement("textarea");
                  textArea.value = text;
                  document.body.appendChild(textArea);
                  textArea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textArea);
                  alert('Discount code copied!');
                }
              }
              
              // Start countdown
              function startCountdown() {
                var minutes = 15;
                var seconds = 0;
                var countdownEl = document.getElementById('countdown');
                
                var timer = setInterval(function() {
                  if (seconds === 0) {
                    if (minutes === 0) {
                      clearInterval(timer);
                      countdownEl.innerHTML = "EXPIRED";
                      return;
                    }
                    minutes--;
                    seconds = 59;
                  } else {
                    seconds--;
                  }
                  
                  countdownEl.innerHTML = minutes + ":" + (seconds < 10 ? "0" + seconds : seconds);
                }, 1000);
              }
              
              startCountdown();
            </script>
          </body>
          </html>
        `);
      } else {
        // Error HTML response
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Loyalty Points Error</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; text-align: center; background-color: #f9f9f9; }
              .card { border: 1px solid #ddd; padding: 20px; max-width: 500px; margin: 0 auto; border-radius: 8px; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .error { color: #d44; font-weight: bold; }
              button { background-color: #4CAF50; color: white; border: none; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 10px 2px; cursor: pointer; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Error</h1>
              <p class="error">❌ ${message}</p>
              <button onclick="window.close()">Close Window</button>
              <button onclick="window.history.back()">Go Back</button>
            </div>
          </body>
          </html>
        `);
      }
    } else {
      // For POST requests or any other method, return JSON
      return res.status(success ? 200 : 400).json({
        success,
        message,
        ...data
      });
    }
  }
  
  /**
   * Calculate points for an order
   * @param {number} orderValue - Order total value
   * @param {string} paymentMethod - Payment method used
   * @returns {number} - Calculated points
   */
  function calculateOrderPoints(orderValue, paymentMethod) {
    let basePoints = Math.round((Math.random() * (2 - 1) + 1) * orderValue / 100);
    
    // Double points for non-COD payments
    if (paymentMethod !== "cash on delivery") {
      basePoints *= 2;
    }
    
    return basePoints;
  }
  
  /**
   * Format log messages with timestamp
   * @param {string} message - Log message
   * @returns {string} - Formatted log message
   */
  function formatLogMessage(message) {
    return `[${new Date().toISOString()}] ${message}`;
  }
  
  module.exports = {
    handleResponse,
    calculateOrderPoints,
    formatLogMessage
  };