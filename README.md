# Shopify Loyalty App - Database-Free Version

A Node.js Express application that provides loyalty points and redemption functionality for Shopify stores. This version uses in-memory storage instead of a database, making it simpler to deploy and run.

## 🚀 Features

- **Loyalty Points System**: Award points on order fulfillment
- **Points Redemption**: Convert points to discount codes
- **Shopify Integration**: Full integration with Shopify Admin API
- **In-Memory Storage**: No database required - all data stored in memory
- **Serverless Ready**: Deployed on Vercel as serverless functions

## 🏗️ Architecture

### Storage
- **In-Memory**: Discount codes stored in memory (resets on server restart)
- **Shopify Metafields**: Customer loyalty points stored in Shopify
- **No Database**: Completely database-free operation

### Key Components
- `server.js` - Main Express server
- `controllers/shopify/` - Business logic controllers
- `utils/supabaseClient.js` - In-memory storage (no actual Supabase)
- `routes/shopifyRoutes.js` - API endpoints

## 🔧 Setup

### Environment Variables
```bash
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-shopify-access-token
ADMIN_SECRET_KEY=your-admin-secret-key
```

### Installation
```bash
npm install
```

### Deployment
```bash
# Deploy to Vercel
vercel
```

## 📊 How It Works

### Points Earning
1. Customer places order
2. Order fulfillment webhook triggers
3. System calculates points (1-2% of order value)
4. Points doubled for non-COD payments
5. Points stored in Shopify customer metafields

### Points Redemption
1. Customer enters points to redeem in cart
2. System validates minimum order value (₹2000)
3. Creates Shopify price rule and discount code
4. Stores code in memory with 15-minute expiration
5. Deducts points from customer account

### Storage Limitations
- **In-Memory**: Data lost on server restart
- **No Persistence**: Discount codes not saved between deployments
- **Simple Operation**: Perfect for testing and small-scale use

## 🎯 API Endpoints

### Public Endpoints
- `GET/POST /shopify/loyalty/redeem` - Redeem points
- `GET /shopify/customer/:id/points` - Get customer points
- `GET /shopify/customer/:id/active-discounts` - Check active discounts

### Webhook Endpoints
- `POST /shopify/webhook/order-fulfilled` - Order fulfillment
- `POST /shopify/webhook/order-canceled` - Order cancellation
- `POST /shopify/webhook/discount-code-used` - Code usage

### Admin Endpoints
- `GET /shopify/admin/cleanup-expired?key=SECRET` - Clean expired codes
- `GET /shopify/admin/cleanup-used?key=SECRET` - Clean used codes

## ⚠️ Important Notes

### In-Memory Storage Limitations
- **Data Loss**: All discount codes are lost when the server restarts
- **No Persistence**: Codes don't survive serverless function cold starts
- **Single Instance**: Won't work with multiple server instances
- **Testing Only**: Recommended for development and testing

### When to Use This Version
- ✅ Development and testing
- ✅ Small-scale deployments
- ✅ Simple proof of concepts
- ✅ When database setup is not possible

### When to Use Database Version
- ❌ Production environments
- ❌ High-traffic stores
- ❌ When data persistence is required
- ❌ Multi-instance deployments

## 🔄 Migration to Database Version

To add database support later:
1. Set up Supabase or another database
2. Replace `utils/supabaseClient.js` with actual database client
3. Update controllers to use database instead of memory
4. Add proper error handling for database operations

## 🛠️ Troubleshooting

### Common Issues
1. **"fetch failed" errors**: Usually network connectivity issues in serverless environment
2. **Memory data loss**: Normal behavior - data resets on restart
3. **Rate limiting**: Built-in protection against abuse

### Debug Endpoints
- `GET /` - Basic health check
- `GET /shopify/loyalty-info` - System status page
- `GET /debug` - Debug information

## 📝 License

ISC License 