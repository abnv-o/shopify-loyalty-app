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
<html lang="en">
<head>
<title>Loyalty Points Redeemed</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  /* Modern Typography */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  
  /* Reset & Base Styles */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Inter', sans-serif;
    background-color: #f8f8f8;
    color: #111;
    line-height: 1.6;
    padding: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }
  
  /* Card Styles */
  .card {
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.08);
    padding: 40px;
    max-width: 520px;
    width: 100%;
    transition: all 0.3s ease;
  }
  
  /* Typography */
  h1 {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 16px;
    color: #000;
  }
  
  p {
    font-size: 16px;
    margin-bottom: 16px;
    color: #333;
  }
  
  /* Success Badge */
  .success-badge {
    display: inline-flex;
    align-items: center;
    background-color: #f1f9f1;
    color: #000;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 50px;
    margin-bottom: 24px;
  }
  
  .success-badge svg {
    margin-right: 8px;
  }
  
  /* Discount Code */
  .code-container {
    margin: 28px 0;
    position: relative;
  }
  
  .code {
    font-family: 'Inter', monospace;
    font-size: 24px;
    font-weight: 600;
    letter-spacing: 1px;
    padding: 20px;
    background-color: #f8f8f8;
    border: 2px solid #000;
    border-radius: 8px;
    text-align: center;
    transition: all 0.2s ease;
  }
  
  /* Timer */
  .timer-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 24px 0;
  }
  
  .timer {
    font-weight: 600;
    font-size: 18px;
    color: #000;
    padding: 8px 16px;
    background-color: #f3f3f3;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
  }
  
  .timer svg {
    margin-right: 8px;
  }
  
  /* Button */
  button {
    background-color: #000;
    color: white;
    border: none;
    padding: 12px 24px;
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    font-weight: 500;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    margin: 16px 0;
  }
  
  button:hover {
    background-color: #333;
    transform: translateY(-2px);
  }
  
  button:active {
    transform: translateY(0);
  }
  
  button svg {
    margin-right: 8px;
  }
  
  /* Warning */
  .expiry-warning {
    display: flex;
    align-items: flex-start;
    background-color: #fff8f8;
    padding: 12px 16px;
    border-radius: 8px;
    margin: 24px 0;
    font-size: 14px;
    color: #555;
  }
  
  .expiry-warning svg {
    min-width: 20px;
    margin-right: 12px;
    margin-top: 2px;
  }
  
  /* Instructions */
  .instructions {
    margin-top: 32px;
    padding: 24px;
    background-color: #f8f8f8;
    border-radius: 8px;
  }
  
  .instructions h3 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    color: #000;
  }
  
  .steps {
    list-style-position: inside;
    padding-left: 0;
  }
  
  .steps li {
    margin-bottom: 12px;
    font-size: 15px;
    display: flex;
    align-items: flex-start;
  }
  
  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    background-color: #000;
    color: white;
    border-radius: 50%;
    font-size: 12px;
    margin-right: 12px;
    font-weight: 600;
  }
  
  /* Error State */
  .error {
    color: #e53935;
    font-weight: 500;
    display: flex;
    align-items: center;
  }
  
  .error svg {
    margin-right: 8px;
  }
  
  .button-group {
    display: flex;
    gap: 12px;
    margin-top: 24px;
  }
  
  .button-group button {
    flex: 1;
  }
  
  .secondary-button {
    background-color: #f1f1f1;
    color: #333;
  }
  
  .secondary-button:hover {
    background-color: #e0e0e0;
  }
  
  /* Animations */
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }
  
  .countdown-pulse {
    animation: pulse 2s infinite ease-in-out;
  }
  
  /* Responsive adjustments */
  @media (max-width: 580px) {
    .card {
      padding: 24px;
      border-radius: 12px;
    }
    
    h1 {
      font-size: 22px;
    }
    
    .code {
      font-size: 20px;
      padding: 16px;
    }
  }
  
  /* Copy feedback */
  .copy-tooltip {
    position: absolute;
    top: -40px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #000;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 14px;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  
  .copy-tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: #000 transparent transparent transparent;
  }
  
  .copy-tooltip.show {
    opacity: 1;
  }
</style>
</head>
<body>
<!-- Success Card -->
<div class="card">
  <div class="success-badge">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    Success
  </div>
  
  <h1>Points Successfully Redeemed</h1>
  <p>You've redeemed ${data.pointsRedeemed} points for a ₹${data.pointsRedeemed} discount on your current order.</p>
  
  <p>Your discount code:</p>
  <div class="code-container">
    <div class="code">${data.discountCode}</div>
    <div class="copy-tooltip" id="copyTooltip">Copied!</div>
  </div>
  
  <div class="timer-container">
    <div class="timer">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      <span id="countdown" class="countdown-pulse">15:00</span> remaining
    </div>
  </div>
  
  <button onclick="copyCode()" id="copyButton">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
    Copy Code
  </button>
  
  <div class="expiry-warning">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
    <div>This discount is valid only for your current cart and will expire in 15 minutes. Complete your purchase before the timer ends.</div>
  </div>
  
  <div class="instructions">
    <h3>What to do next:</h3>
    <ul class="steps">
      <li><div class="step-number">1</div> Copy your discount code</li>
      <li><div class="step-number">2</div> Return to your cart</li>
      <li><div class="step-number">3</div> Proceed to checkout</li>
      <li><div class="step-number">4</div> Apply the code in the discount field</li>
      <li><div class="step-number">5</div> Complete your purchase</li>
    </ul>
  </div>
</div>

<!-- Error Card (Hidden by default) -->
<div class="card" id="errorCard" style="display: none;">
  <h1>Unable to Redeem Points</h1>
  <p class="error">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
    <span id="errorMessage">${message}</span>
  </p>
  <div class="button-group">
    <button class="secondary-button" onclick="window.history.back()">Go Back</button>
    <button onclick="window.close()">Close Window</button>
  </div>
</div>

<script>
  // Copy code function
  function copyCode() {
    const text = "${data.discountCode}";
    const copyButton = document.getElementById('copyButton');
    const copyTooltip = document.getElementById('copyTooltip');
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function() {
        showCopyFeedback();
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
      showCopyFeedback();
    }
    
    function showCopyFeedback() {
      // Show tooltip
      copyTooltip.classList.add('show');
      
      // Change button text temporarily
      const originalButtonHTML = copyButton.innerHTML;
      copyButton.innerHTML = \`
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Copied!
      \`;
      
      // Reset after 2 seconds
      setTimeout(() => {
        copyTooltip.classList.remove('show');
        copyButton.innerHTML = originalButtonHTML;
      }, 2000);
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
          countdownEl.style.color = "#e53935";
          countdownEl.classList.remove('countdown-pulse');
          return;
        }
        minutes--;
        seconds = 59;
      } else {
        seconds--;
      }
      
      // Add warning color when less than 5 minutes
      if (minutes < 5) {
        countdownEl.style.color = "#e53935";
      }
      
      // Add extra pulse effect when less than 3 minutes
      if (minutes < 3) {
        countdownEl.classList.add('countdown-pulse');
      }
      
      countdownEl.innerHTML = minutes + ":" + (seconds < 10 ? "0" + seconds : seconds);
    }, 1000);
  }
  
  // Show error card function (for demonstration)
  function showError(message) {
    document.querySelector('.card').style.display = 'none';
    const errorCard = document.getElementById('errorCard');
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message || "An error occurred while redeeming points.";
    errorCard.style.display = 'block';
  }
  
  // Initialize
  startCountdown();
  
  // For demonstration - show error state (uncomment to test)
  // setTimeout(() => showError("Insufficient points for redemption."), 3000);
</script>
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