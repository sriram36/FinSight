import json
import logging
import re
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone

from backend.config import settings
from backend.services.llm_service import get_openai_client
from backend.services.verifier_service import verify_recommendation_claims
from backend.services.affordability_service import evaluate_affordability
from backend.schemas.scenario import AffordabilityRequest

logger = logging.getLogger("finsight.chat")

def process_financial_chat(user_id: str, message: str, db) -> Dict[str, Any]:
    """
    Executes conversational financial intelligence with deterministic calculation
    and strict claim verification.
    """
    cursor = db.cursor()
    msg_lower = message.lower().strip()

    # Step 1: Detect Intent & Extract Entities
    intent = "general_inquiry"
    category = None
    target_amount = None

    # Amount extraction (e.g. ₹15,000 or $500 or 15000)
    amt_match = re.search(r'(?:₹|\$|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)', msg_lower)
    if amt_match:
        try:
            raw_amt = amt_match.group(1).replace(",", "")
            val = float(raw_amt)
            if val > 10.0 and ("afford" in msg_lower or "buy" in msg_lower or "spend" in msg_lower or "purchase" in msg_lower):
                target_amount = val
        except Exception:
            pass

    # Category matching against actual user categories
    cursor.execute("SELECT DISTINCT category FROM transactions WHERE user_id = ?", (user_id,))
    known_categories = [r[0] for r in cursor.fetchall() if r[0]]

    # 1. Direct exact or substring match in user's real categories
    for cat in known_categories:
        if cat.lower() in msg_lower:
            category = cat
            break

    # 2. Alias / synonym matching mapped to user's real categories
    if not category:
        category_aliases = {
            "Dining Out": ["food", "dining", "eating", "restaurant", "swiggy", "zomato", "cafe", "takeout", "lunch", "dinner"],
            "Dining": ["food", "dining", "eating", "restaurant", "swiggy", "zomato", "cafe", "takeout", "lunch", "dinner"],
            "Groceries": ["groceries", "grocery", "supermarket", "bigbasket", "provisions", "mart"],
            "Shopping": ["shopping", "clothes", "amazon", "retail", "myntra", "flipkart"],
            "Retail": ["shopping", "clothes", "amazon", "retail", "store"],
            "Utilities": ["bills", "utility", "electricity", "water", "wifi", "broadband", "power"],
            "Rent/Mortgage": ["rent", "mortgage", "housing", "landlord", "flat rent"],
            "Housing": ["rent", "mortgage", "housing", "landlord"],
            "Transportation": ["transport", "commute", "uber", "ola", "metro", "fuel", "petrol", "cab"],
            "Subscriptions": ["subscription", "subscriptions", "netflix", "spotify", "prime", "youtube"],
            "Healthcare": ["health", "medical", "doctor", "medicine", "pharmacy", "hospital"]
        }
        for known_cat in known_categories:
            for alias_key, words in category_aliases.items():
                if known_cat.lower() == alias_key.lower() and any(w in msg_lower for w in words):
                    category = known_cat
                    break
            if category:
                break

    # 3. Fallback to common taxonomy names if not found in current ledger
    if not category:
        fallback_map = [
            ("Dining", ["food", "dining", "eating", "restaurant", "swiggy", "zomato"]),
            ("Groceries", ["groceries", "grocery", "supermarket", "bigbasket"]),
            ("Shopping", ["shopping", "clothes", "amazon", "retail"]),
            ("Utilities", ["bills", "utility", "electricity", "water"]),
            ("Subscriptions", ["subscription", "subscriptions", "netflix", "spotify"]),
            ("Transportation", ["transport", "commute", "uber", "ola", "metro"])
        ]
        for alias_key, words in fallback_map:
            if any(w in msg_lower for w in words):
                category = alias_key
                break

    # Date range parsing
    now = datetime.now(timezone.utc)
    date_filter = None
    date_label = "all-time"

    if "last month" in msg_lower or "previous month" in msg_lower:
        first_this_month = now.replace(day=1)
        last_day_prev_month = first_this_month - timedelta(days=1)
        first_day_prev_month = last_day_prev_month.replace(day=1)
        date_filter = (first_day_prev_month.strftime("%Y-%m-%d"), last_day_prev_month.strftime("%Y-%m-%d"))
        date_label = f"in previous month ({date_filter[0]} to {date_filter[1]})"
    elif "this month" in msg_lower or "current month" in msg_lower:
        first_this_month = now.replace(day=1)
        date_filter = (first_this_month.strftime("%Y-%m-%d"), now.strftime("%Y-%m-%d"))
        date_label = f"this month ({date_filter[0]} to {date_filter[1]})"
    elif "last 30 days" in msg_lower or "past 30 days" in msg_lower:
        start_date = now - timedelta(days=30)
        date_filter = (start_date.strftime("%Y-%m-%d"), now.strftime("%Y-%m-%d"))
        date_label = f"over the last 30 days ({date_filter[0]} to {date_filter[1]})"
    elif "last 90 days" in msg_lower or "past 90 days" in msg_lower:
        start_date = now - timedelta(days=90)
        date_filter = (start_date.strftime("%Y-%m-%d"), now.strftime("%Y-%m-%d"))
        date_label = f"over the last 90 days ({date_filter[0]} to {date_filter[1]})"

    # Intent classification
    if any(w in msg_lower for w in ["keep ₹", "keep rs", "hard floor", "set a floor", "constraint", "rent on the", "add constraint", "iou"]):
        intent = "constraint_write"
    elif any(w in msg_lower for w in ["afford", "can i buy", "purchase", "affordability"]):
        intent = "affordability_check"
    elif any(w in msg_lower for w in ["which budget", "budget status", "budgets", "burn rate", "likely to exceed"]):
        intent = "budget_status"
    elif any(w in msg_lower for w in ["payments are due", "upcoming bill", "due in", "subscriptions", "recurring"]):
        intent = "recurring_inquiry"
    elif any(w in msg_lower for w in ["flagged", "unusual", "anomaly", "anomalies", "duplicate"]):
        intent = "anomaly_inquiry"
    elif any(w in msg_lower for w in ["forecast", "future balance", "outlook", "cash flow forecast"]):
        intent = "forecast_inquiry"
    elif any(w in msg_lower for w in ["summarize my month", "monthly review", "month review", "summarize month"]):
        intent = "monthly_review_inquiry"
    elif any(w in msg_lower for w in ["how much", "what did i spend", "spent on", "total spent"]):
        intent = "category_spending"
    elif any(w in msg_lower for w in ["why did my savings", "savings drop", "savings change", "why is savings"]):
        intent = "savings_analysis"
    elif any(w in msg_lower for w in ["top categories", "biggest expenses", "where does my money go", "highest spend"]):
        intent = "top_categories"
    elif category:
        intent = "category_spending"

    # Step 2: Deterministic Python Execution (Truth Engine)
    evidence = {}
    facts = {}
    cited_transactions = []
    deterministic_reply = ""
    suggested_followups = []

    if intent == "constraint_write":
        from backend.services.profile_service import create_user_constraint, list_user_constraints, calculate_true_safe_to_spend
        from backend.schemas.profile import UserConstraintCreate
        from backend.services.verifier_service import bind_evidence_bundle

        ctype = "HARD_FLOOR"
        label = "Emergency hard floor"
        due_day = None
        if "rent" in msg_lower or "hostel" in msg_lower or "mess" in msg_lower:
            ctype = "FIXED_OBLIGATION"
            label = "Rent / fixed obligation"
            day_m = re.search(r'\b(?:on the |due )?(\d{1,2})(?:st|nd|rd|th)?\b', msg_lower)
            if day_m:
                due_day = max(1, min(28, int(day_m.group(1))))
        elif "iou" in msg_lower or "split" in msg_lower:
            ctype = "PENDING_IOU"
            label = "Pending split-bill IOU"
        elif "late-night" in msg_lower or "late night" in msg_lower or "cap" in msg_lower:
            ctype = "BEHAVIORAL_CAP"
            label = "Behavioral spending cap"

        amount_val = target_amount
        if amount_val is None:
            amt2 = re.search(r'(?:₹|\$|rs\.?)\s*([0-9,]+(?:\.[0-9]+)?)', message, re.IGNORECASE)
            if not amt2:
                amt2 = re.search(r'\b([0-9]{3,6})\b', msg_lower)
            if amt2:
                amount_val = float(amt2.group(1).replace(",", ""))
        amount_val = float(amount_val or 3000.0)

        created = create_user_constraint(
            UserConstraintCreate(
                user_id=user_id,
                constraint_type=ctype,  # type: ignore
                label=label,
                amount=amount_val,
                due_day=due_day,
            ),
            db,
        )
        sts = calculate_true_safe_to_spend(user_id, db)
        facts = {
            "constraint_type": ctype,
            "amount": amount_val,
            "safe_to_spend_today": sts.safe_to_spend_today,
            "raw_balance": sts.raw_balance,
            "locked_by_constraints": sts.locked_by_constraints,
        }
        evidence = facts.copy()
        deterministic_reply = (
            f"Saved a {ctype.replace('_', ' ').title()} of ₹{amount_val:,.2f} ({created.label}). "
            f"True safe-to-spend today is now ₹{sts.safe_to_spend_today:,.2f}/day against a raw balance of ₹{sts.raw_balance:,.2f} "
            f"with ₹{sts.locked_by_constraints:,.2f} locked by constraints."
        )
        suggested_followups = [
            "Can I afford a ₹12,000 weekend trip?",
            "Show my active constraints",
            "What is my liquidity runway?",
        ]

    elif intent == "affordability_check" and target_amount:
        # Fetch current liquidity from real income vs spending (NEVER invent numbers)
        cursor.execute("""
        SELECT 
            SUM(CASE WHEN direction = 'income' OR direction = 'credit' THEN amount ELSE 0 END) AS total_inc,
            SUM(CASE WHEN direction = 'spending' OR direction = 'debit' THEN amount ELSE 0 END) AS total_exp
        FROM transactions WHERE user_id = ?
        """, (user_id,))
        bal_row = cursor.fetchone()
        tot_inc = float(bal_row["total_inc"] or 0.0) if bal_row else 0.0
        tot_exp = float(bal_row["total_exp"] or 0.0) if bal_row else 0.0
        net_cash_flow = round(tot_inc - tot_exp, 2)

        # Real confirmed available liquid balance derived directly from ledger
        verified_balance = max(0.0, net_cash_flow)

        # Active goals monthly needed
        cursor.execute("SELECT SUM(target_amount) FROM goals WHERE user_id = ? AND status = 'active'", (user_id,))
        g_row = cursor.fetchone()

        # Check confirmed upcoming obligations from recurring_items (if any table exists)
        try:
            cursor.execute("SELECT SUM(amount) FROM recurring_items WHERE user_id = ? AND status = 'active'", (user_id,))
            rec_row = cursor.fetchone()
            confirmed_obligations = round(float(rec_row[0] or 0.0), 2) if rec_row and rec_row[0] else 0.0
        except Exception:
            confirmed_obligations = 0.0

        aff_req = AffordabilityRequest(
            user_id=user_id,
            purchase_amount=target_amount,
            available_balance=verified_balance,
            upcoming_obligations=confirmed_obligations,
            emergency_buffer=0.0
        )
        aff_result = evaluate_affordability(aff_req, db)

        verdict = aff_result.verdict
        post_bal = aff_result.post_purchase_remainder if aff_result.post_purchase_remainder is not None else 0.0
        facts = {
            "purchase_amount": target_amount,
            "verdict": verdict,
            "available_balance": round(verified_balance, 2),
            "post_purchase_balance": round(post_bal, 2),
            "category": category or "Discretionary"
        }
        evidence = facts.copy()
        evidence["purchase_amount"] = target_amount
        evidence["post_purchase_balance"] = round(post_bal, 2)
        evidence["available_balance"] = round(verified_balance, 2)

        deterministic_reply = (
            f"Based on your verified ledger cash flow (net recorded surplus of ₹{verified_balance:,.2f}), "
            f"a purchase of ₹{target_amount:,.2f} receives an affordability verdict of **{verdict.upper()}**. "
            f"After this purchase, your remaining safe balance would be ₹{post_bal:,.2f}. "
            f"{aff_result.summary} "
            f"Note: Evaluated against your confirmed ledger transactions with ₹{confirmed_obligations:,.2f} scheduled obligations."
        )
        suggested_followups = [
            f"What if I buy it next month instead?",
            f"How much have I spent on {category or 'Shopping'} so far?",
            "Show my active financial goals"
        ]

    elif intent == "category_spending" and category:
        if date_filter:
            cursor.execute("""
            SELECT id, transaction_date, description, amount, direction, category
            FROM transactions 
            WHERE user_id = ? AND category = ? AND (direction = 'spending' OR direction = 'debit')
              AND transaction_date >= ? AND transaction_date <= ?
            ORDER BY transaction_date DESC
            """, (user_id, category, date_filter[0], date_filter[1]))
        else:
            cursor.execute("""
            SELECT id, transaction_date, description, amount, direction, category
            FROM transactions 
            WHERE user_id = ? AND category = ? AND (direction = 'spending' OR direction = 'debit')
            ORDER BY transaction_date DESC
            """, (user_id, category))

        tx_rows = cursor.fetchall()
        tx_items = [dict(r) for r in tx_rows]
        total_spent = sum(float(r["amount"]) for r in tx_items)
        count = len(tx_items)
        cited_transactions = tx_items[:5]

        latest_amount = round(float(cited_transactions[0]["amount"]), 2) if cited_transactions else 0.0

        facts = {
            "category": category,
            "total_spent": round(total_spent, 2),
            "transaction_count": count,
            "period": date_label
        }
        evidence = facts.copy()
        evidence["total_spent"] = round(total_spent, 2)
        evidence["transaction_count"] = count
        evidence["source_transaction_ids"] = [r["id"] for r in cited_transactions]
        if cited_transactions:
            evidence["latest_amount"] = latest_amount
            facts["latest_amount"] = latest_amount

        deterministic_reply = (
            f"You have spent a total of ₹{total_spent:,.2f} across {count} transaction{'' if count == 1 else 's'} in {category} {date_label}. "
            f"Your latest transaction was on {cited_transactions[0]['transaction_date']}: {cited_transactions[0]['description']} (₹{latest_amount:,.2f})."
            if count > 0 else f"You have zero recorded transactions in {category} {date_label}."
        )
        suggested_followups = [
            f"Can I afford to spend ₹2,000 more on {category}?",
            "What are my biggest overall expenses?",
            "Show recommendations for reducing discretionary spending"
        ]

    elif intent == "top_categories":
        # Calculate real total spending across all categories as denominator
        cursor.execute("""
        SELECT SUM(amount) AS overall_spend
        FROM transactions
        WHERE user_id = ? AND (direction = 'spending' OR direction = 'debit')
        """, (user_id,))
        overall_row = cursor.fetchone()
        real_total_spending = round(float(overall_row["overall_spend"] or 0.0), 2) if overall_row else 0.0

        cursor.execute("""
        SELECT category, SUM(amount) AS cat_total, COUNT(*) AS tx_count
        FROM transactions
        WHERE user_id = ? AND (direction = 'spending' OR direction = 'debit')
        GROUP BY category
        ORDER BY cat_total DESC
        LIMIT 5
        """, (user_id,))
        top_cats = cursor.fetchall()
        top_5_spending = round(sum(float(r["cat_total"]) for r in top_cats), 2)

        top_list = []
        for r in top_cats:
            c_name = r["category"]
            c_amt = round(float(r["cat_total"]), 2)
            pct = round((c_amt / real_total_spending * 100), 1) if real_total_spending > 0 else 0.0
            top_list.append(f"{c_name}: ₹{c_amt:,.2f} ({pct}% of total spending)")

        facts = {
            "top_categories": top_list,
            "total_spending": real_total_spending,
            "top_5_sum": top_5_spending
        }
        evidence = {
            "total_spending": real_total_spending,
            "total_spent": top_5_spending
        }
        for idx, r in enumerate(top_cats):
            evidence[f"cat_{idx+1}_amount"] = round(float(r["cat_total"]), 2)

        deterministic_reply = (
            f"Here is your spending breakdown across your top categories (overall ledger spending ₹{real_total_spending:,.2f}):\n" +
            "\n".join([f"• **{item}**" for item in top_list])
        )
        suggested_followups = [
            "How can I cut spending in my highest category?",
            "Check my monthly savings rate",
            "Can I afford a ₹10,000 vacation?"
        ]

    elif intent == "savings_analysis":
        # Decision Replay / Variance Attribution against spending profile
        from backend.services.profile_service import calculate_spending_profile
        profile = calculate_spending_profile(user_id, db)

        top_dev_cat = profile.highest_deviation_category
        tot_rec = round(profile.total_recent_spending, 2)
        tot_base = round(profile.total_baseline_spending, 2)

        dev_info = ""
        monthly_impact = 0.0
        pct_dev = 0.0
        if top_dev_cat and top_dev_cat in profile.categories:
            cat_data = profile.categories[top_dev_cat]
            pct_dev = round(cat_data.percentage_deviation or 0.0, 1)
            monthly_impact = round(max(0.0, cat_data.recent_daily_pace - cat_data.baseline_daily_pace) * 30.0, 2)
            dev_info = (
                f"The primary driver is **{top_dev_cat}**, where your recent spending pace increased by **{pct_dev}%** "
                f"above your historical baseline (an estimated impact of ₹{monthly_impact:,.2f}/month)."
            )
        else:
            dev_info = "Your recent category spending paces have remained within historical variance."

        facts = {
            "recent_total": tot_rec,
            "baseline_total": tot_base,
            "percentage_deviation": pct_dev,
            "monthly_impact": monthly_impact,
            "driver_category": top_dev_cat or "None"
        }
        evidence = {
            "recent_amount": tot_rec,
            "baseline_amount": tot_base,
            "percentage_deviation": pct_dev,
            "monthly_impact": monthly_impact
        }
        deterministic_reply = (
            f"In your recent spending window ({profile.recent_days} days), total spending was ₹{tot_rec:,.2f} "
            f"compared to ₹{tot_base:,.2f} across the baseline window ({profile.baseline_days} days). "
            f"{dev_info} All figures are mathematically reconciled against your imported ledger."
        )
        suggested_followups = [
            f"How much did I spend on {top_dev_cat or 'Dining'} recently?",
            "Show recommendations to reduce spending",
            "What are my biggest categories?"
        ]

    elif intent == "budget_status":
        from backend.services.budget_service import get_monthly_budget_summary
        cur_month = now.strftime("%Y-%m")
        bs = get_monthly_budget_summary(user_id, cur_month, db)
        tot_b = round(bs["total_budget_limit"], 2)
        tot_s = round(bs["total_spent"], 2)
        rem = round(bs["remaining_budget"], 2)
        over_cnt = bs["overrun_count"]

        over_cats = [c["category"] for c in bs["categories"] if c["status"] in ("exceeded", "projected_overrun")]
        over_msg = f"Categories approaching or over limit: {', '.join(over_cats)}." if over_cats else "All categories are currently within healthy pace."

        facts = {
            "total_budget": tot_b,
            "total_spent": tot_s,
            "remaining": rem,
            "overrun_count": over_cnt
        }
        evidence = {
            "total_budget": tot_b,
            "total_spent": tot_s,
            "remaining": rem
        }
        deterministic_reply = (
            f"For {cur_month}, your total monthly budget limit is ₹{tot_b:,.2f}, with ₹{tot_s:,.2f} spent so far, "
            f"leaving ₹{rem:,.2f} remaining. {over_msg}"
        )
        suggested_followups = [
            "What payments are due this month?",
            "Can I afford a ₹3,000 purchase?",
            "Forecast my cash flow for the next 30 days"
        ]

    elif intent == "recurring_inquiry":
        from backend.services.recurring_service import get_upcoming_schedule
        sch = get_upcoming_schedule(user_id, 30, db)
        tot_up = round(sch.get("total_upcoming_amount", 0.0), 2)
        up_items = sch.get("upcoming_items", [])
        top_bills = [f"{i['merchant']} (₹{i['amount']:,.2f} on {i['due_date']})" for i in up_items[:3]]
        bills_str = "; ".join(top_bills) if top_bills else "no confirmed upcoming bills"

        facts = {
            "total_upcoming": tot_up,
            "bills_count": len(up_items)
        }
        evidence = {
            "total_upcoming": tot_up
        }
        deterministic_reply = (
            f"Over the next 30 days, you have {len(up_items)} upcoming commitment(s) totaling ₹{tot_up:,.2f}. "
            f"Next scheduled payments include: {bills_str}."
        )
        suggested_followups = [
            "Which budgets am I likely to exceed?",
            "Can I afford a ₹5,000 purchase?",
            "Any unusual spending detected?"
        ]

    elif intent == "anomaly_inquiry":
        from backend.services.anomaly_service import get_user_anomalies, detect_anomalies_from_ledger
        alerts = get_user_anomalies(user_id, db, status_filter="new")
        if not alerts:
            alerts = detect_anomalies_from_ledger(user_id, db)
            alerts = [a for a in alerts if a["status"] == "new"]

        tot_flag = round(sum(a["amount"] for a in alerts), 2)
        top_alerts = [f"{a['title']} (₹{a['amount']:,.2f})" for a in alerts[:2]]
        alert_str = "; ".join(top_alerts) if top_alerts else "No unusual charges flagged"

        facts = {
            "flagged_amount": tot_flag,
            "alert_count": len(alerts)
        }
        evidence = {
            "flagged_amount": tot_flag
        }
        deterministic_reply = (
            f"You have {len(alerts)} active unusual spending alert(s) totaling ₹{tot_flag:,.2f}. "
            f"Highlighted entries: {alert_str}. Review them in the Unusual Spending section."
        )
        suggested_followups = [
            "Check my monthly savings rate",
            "Show my top spending categories",
            "What is my 30-day forecast?"
        ]

    elif intent == "forecast_inquiry":
        from backend.services.forecast_service import calculate_cash_flow_forecast
        fc = calculate_cash_flow_forecast(user_id, 30, None, db)
        p_inc = round(fc.get("projected_income", 0.0), 2)
        p_out = round(fc.get("projected_total_outflow", 0.0), 2)
        p_net = round(fc.get("projected_net_cash_flow", 0.0), 2)

        facts = {
            "projected_income": p_inc,
            "projected_outflow": p_out,
            "projected_net": p_net
        }
        evidence = {
            "projected_income": p_inc,
            "projected_outflow": p_out,
            "projected_net": p_net
        }
        deterministic_reply = (
            f"Over the next 30 days, your projected income is ₹{p_inc:,.2f} and expected total outflow is ₹{p_out:,.2f}, "
            f"yielding a projected net cash-flow delta of ₹{p_net:,.2f} based on observed ledger burn rate and upcoming obligations."
        )
        suggested_followups = [
            "Which budgets am I likely to exceed?",
            "What payments are due in the next 30 days?",
            "Can I afford a ₹15,000 purchase?"
        ]

    elif intent == "monthly_review_inquiry":
        from backend.services.review_service import generate_monthly_review
        cur_m = now.strftime("%Y-%m")
        rev = generate_monthly_review(user_id, cur_m, db)
        t_inc = round(rev["total_income"], 2)
        t_sp = round(rev["total_spending"], 2)
        t_net = round(rev["net_cash_flow"], 2)
        s_rate = rev["savings_rate_pct"]

        facts = {
            "total_income": t_inc,
            "total_spending": t_sp,
            "net_savings": t_net,
            "savings_rate_pct": s_rate
        }
        evidence = {
            "total_income": t_inc,
            "total_spending": t_sp,
            "net_savings": t_net,
            "savings_rate_pct": s_rate
        }
        deterministic_reply = (
            f"In {cur_m}, your ledger records ₹{t_inc:,.2f} in income and ₹{t_sp:,.2f} in spending, "
            f"yielding net cash flow of ₹{t_net:,.2f} ({s_rate}% savings rate). "
            f"Check the Monthly Review tab for category comparisons and budget variances."
        )
        suggested_followups = [
            "What are my highest expenses?",
            "Which budgets did I exceed?",
            "Forecast my cash flow for next month"
        ]

    else:  # General savings / default analysis
        cursor.execute("""
        SELECT 
            SUM(CASE WHEN direction = 'income' OR direction = 'credit' THEN amount ELSE 0 END) AS total_inc,
            SUM(CASE WHEN direction = 'spending' OR direction = 'debit' THEN amount ELSE 0 END) AS total_exp,
            COUNT(*) AS total_count
        FROM transactions WHERE user_id = ?
        """, (user_id,))
        summary_row = cursor.fetchone()
        tot_inc = round(float(summary_row["total_inc"] or 0.0), 2)
        tot_exp = round(float(summary_row["total_exp"] or 0.0), 2)
        savings = round(tot_inc - tot_exp, 2)
        rate = round((savings / tot_inc * 100), 1) if tot_inc > 0 else 0.0

        facts = {
            "total_income": tot_inc,
            "total_spending": tot_exp,
            "net_savings": savings,
            "savings_rate_pct": rate
        }
        evidence = facts.copy()

        deterministic_reply = (
            f"Your ledger records ₹{tot_inc:,.2f} in total income and ₹{tot_exp:,.2f} in total spending, "
            f"resulting in net savings of ₹{savings:,.2f} (a {rate}% savings rate). "
            "All metrics are verified from your local transaction history."
        )
        suggested_followups = [
            "Where did most of my money go?",
            "Can I afford a ₹5,000 purchase?",
            "Show verified spending recommendations"
        ]

    # Step 3: LLM Generation (Azure OpenAI gpt-5.6-luna) with strict grounding
    final_reply = deterministic_reply
    generation_mode = "deterministic_fallback"
    model_name = "rule_engine"

    client = get_openai_client()
    if client:
        try:
            deployment = settings.AZURE_OPENAI_DEPLOYMENT or "gpt-5.6-luna"
            sys_prompt = (
                "You are FinSight AI, an institutional-grade financial copilot. "
                "CRITICAL VERIFICATION RULES:\n"
                "1. You MUST ONLY use the EXACT numbers provided in the FACTS object.\n"
                "2. Do NOT invent, round, extrapolate, or perform arithmetic on numbers.\n"
                "3. Explain the insights clearly, empathetically, and professionally in markdown.\n"
                "4. Return JSON with key: reply."
            )
            user_prompt = f"User Query: {message}\nFacts: {json.dumps(facts)}"

            kwargs = {
                "model": deployment,
                "messages": [
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "response_format": {"type": "json_object"}
            }

            try:
                res = client.chat.completions.create(**kwargs, max_completion_tokens=350)
            except Exception as e:
                err_str = str(e).lower()
                if "unsupported_parameter" in err_str or "max_completion_tokens" in err_str:
                    res = client.chat.completions.create(**kwargs, max_tokens=350)
                else:
                    raise e

            parsed = json.loads(res.choices[0].message.content)
            candidate_reply = parsed.get("reply", "")

            # Step 4: Strict Claim Verification on LLM reply
            v_res = verify_recommendation_claims(candidate_reply, evidence, tolerance=0.01)
            if v_res.is_verified and len(candidate_reply.strip()) > 10:
                final_reply = candidate_reply
                generation_mode = "azure_openai"
                model_name = deployment
            else:
                logger.warning(f"Chat claim verifier flagged candidate reply ({v_res.notes}); using verified deterministic reply.")
        except Exception as e:
            logger.warning(f"Chat LLM generation failed or timed out: {e}")

    # Re-verify final reply to provide transparent audit badge
    audit_verification = verify_recommendation_claims(final_reply, evidence, tolerance=0.01)

    from backend.services.verifier_service import bind_evidence_bundle
    from backend.services.profile_service import list_user_constraints as _list_constraints
    cited_ids = [t.get("id") for t in cited_transactions if t.get("id")]
    exact_sum = float(evidence.get("total_spent") or evidence.get("purchase_amount") or evidence.get("exact_sum") or 0.0)
    baseline_sum = float(evidence.get("baseline_amount") or evidence.get("available_balance") or 0.0)
    evidence_bundle = bind_evidence_bundle(
        cited_ids,
        exact_sum,
        baseline_sum,
        extra={k: v for k, v in evidence.items() if isinstance(v, (int, float)) and not isinstance(v, bool)},
        claim_text=final_reply,
    )
    try:
        active_constraints = [c.model_dump() for c in _list_constraints(user_id, db, active_only=True)]
    except Exception:
        active_constraints = []

    return {
        "reply": final_reply,
        "intent": intent,
        "facts": facts,
        "is_verified": audit_verification.is_verified,
        "verifier_notes": audit_verification.notes,
        "generation_mode": generation_mode,
        "model": model_name,
        "cited_transactions": cited_transactions,
        "suggested_followups": suggested_followups,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "evidence_bundle": evidence_bundle,
        "active_constraints": active_constraints,
    }
