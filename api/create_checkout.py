"""
Checkout session creator — stub.

This endpoint returns a payment-provider checkout URL. We've left the provider
swap point obvious. Pick one and fill in the TODOs:

  - Stripe Checkout      → set STRIPE_SECRET_KEY + STRIPE_PRICE_ID env vars,
                            uncomment the Stripe branch below.
  - Razorpay Subscriptions → set RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET +
                              RAZORPAY_PLAN_ID, uncomment Razorpay branch.

Until then, this returns 503 with a message so the UI shows a friendly error
instead of looping.

Endpoint contract:
  POST /api/create_checkout
  Headers: Authorization: Bearer <supabase-jwt>
  Body:    {"tier": "pro"}
  Returns: {"checkout_url": "https://..."} | {"error": "..."}
"""
import os
import json
from http.server import BaseHTTPRequestHandler
from urllib.request import Request, urlopen

SUPABASE_URL = (os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL") or "").rstrip("/")
SUPABASE_ANON = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY", "")

# Optional — fill these in your Vercel env to enable real checkout.
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_PRICE_ID   = os.environ.get("STRIPE_PRICE_ID", "")
RAZORPAY_KEY_ID   = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_PLAN_ID  = os.environ.get("RAZORPAY_PLAN_ID", "")


def _json(handler, status, body):
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.end_headers()
    handler.wfile.write(json.dumps(body).encode("utf-8"))


def _verify_user(jwt):
    if not (SUPABASE_URL and SUPABASE_ANON and jwt):
        return None
    try:
        req = Request(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"apikey": SUPABASE_ANON, "Authorization": f"Bearer {jwt}"},
        )
        with urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception:
        return None


def _origin(handler) -> str:
    return handler.headers.get("Origin") or handler.headers.get("Referer") or "https://constrat.app"


# ---------------------------------------------------------------------------
# Provider branches
# ---------------------------------------------------------------------------

def _stripe_checkout(user_id, user_email, origin):
    """
    To enable: pip install stripe (add to api/requirements.txt) then:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
            customer_email=user_email,
            client_reference_id=user_id,
            success_url=f"{origin}/account?upgraded=1",
            cancel_url=f"{origin}/payment?canceled=1",
        )
        return {"checkout_url": session.url}
    """
    if not (STRIPE_SECRET_KEY and STRIPE_PRICE_ID):
        return None
    # Stub: real implementation above. Returning None keeps the 503 path.
    return None


def _razorpay_checkout(user_id, user_email, origin):
    """
    To enable: pip install razorpay then:
        import razorpay
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, os.environ['RAZORPAY_KEY_SECRET']))
        sub = client.subscription.create({
            "plan_id": RAZORPAY_PLAN_ID,
            "total_count": 12,
            "customer_notify": 1,
            "notes": {"user_id": user_id},
        })
        return {"checkout_url": sub["short_url"]}
    """
    if not (RAZORPAY_KEY_ID and RAZORPAY_PLAN_ID):
        return None
    return None


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.end_headers()

    def do_POST(self):
        try:
            auth = self.headers.get("Authorization", "")
            if not auth.lower().startswith("bearer "):
                return _json(self, 401, {"error": "missing_auth"})
            user = _verify_user(auth.split(" ", 1)[1].strip())
            if not user or "id" not in user:
                return _json(self, 401, {"error": "invalid_session"})

            origin = _origin(self).split("/api")[0]

            # Try Stripe, then Razorpay.
            result = (
                _stripe_checkout(user["id"], user.get("email", ""), origin)
                or _razorpay_checkout(user["id"], user.get("email", ""), origin)
            )

            if not result:
                return _json(self, 503, {
                    "error": (
                        "Payments are not yet configured on this deployment. "
                        "Ask the admin to set STRIPE_* or RAZORPAY_* env vars."
                    ),
                })

            return _json(self, 200, result)
        except Exception as e:
            return _json(self, 500, {"error": str(e)})
