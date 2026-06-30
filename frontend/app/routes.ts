import { type RouteConfig, route, layout } from "@react-router/dev/routes";

export default [
  // Auth routes
  route("login", "routes/auth.login.tsx"),
  route("register", "routes/auth.register.tsx"),

  // Landing Page
  route("/", "routes/home.tsx"),

  // Main app routes
  layout("routes/app.tsx", [
    route("dashboard", "routes/app.dashboard.tsx"),
    route("onboarding", "routes/app.supplier.onboarding.tsx"),
    
    // Product catalog subroutes
    route("products", "routes/app.products._index.tsx"),
    route("products/new", "routes/app.products.new.tsx"),
    route("products/:id/edit", "routes/app.products.$id.edit.tsx"),
    route("products/upload", "routes/app.products.upload.tsx"),

    // Orders subroutes
    route("orders", "routes/app.orders._index.tsx"),
    route("orders/:id", "routes/app.orders.$id.tsx"),

    // Wallet subroute
    route("wallet", "routes/app.wallet._index.tsx"),

    // Reputation & Metrics
    route("reputation", "routes/app.reputation._index.tsx"),

    // Operator Analytics
    route("analytics", "routes/app.analytics._index.tsx"),

    // Seller catalogue
    route("catalogue", "routes/app.catalogue._index.tsx"),
    route("catalogue/:id", "routes/app.catalogue.$id.tsx"),

    // Notifications
    route("notifications", "routes/app.notifications._index.tsx"),
  ]),
] satisfies RouteConfig;
