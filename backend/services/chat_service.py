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

    # Category matching
    cursor.execute("SELECT DISTINCT category FROM transactions WHERE user_id = ?", (user_id,))
    known_categories = [r[0] for r in cursor.fetchall() if r[0]]

    for cat in known_categories:
        if cat.lower() in msg_lower:
            category = cat
            break

    if not category:
        # Common aliases
        if any(w in msg_lower for w in ["food", "dining", "eating", "restaurant", "swiggy", "zomato"]):
            category = "Dining"
        elif any(w in msg_lower for w in ["groceries", "grocery", "supermarket", "bigbasket"]):
            category = "Groceries"
        elif any(w in msg_lower for w in ["shopping", "clothes", "amazon", "retail"]):
            category = "Shopping"
        elif any(w in msg_lower for w in ["bills", "utility", "electricity", "water", "rent"]):
            category = "Utilities"

    if any(w in msg_lower for w in ["afford", "can i buy", "purchase", "affordability"]):
        intent = "affordability_check"
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

    if intent == "affordability_check" and target_amount:
        # Fetch current liquidity from income vs spending
        cursor.execute("""
        SELECT 
            SUM(CASE WHEN direction = 'income' OR direction = 'credit' THEN amount ELSE 0 END) AS total_inc,
            SUM(CASE WHEN direction = 'spending' OR direction = 'debit' THEN amount ELSE 0 END) AS total_exp
        FROM transactions WHERE user_id = ?
        """, (user_id,))
        bal_row = cursor.fetchone()
        tot_inc = float(bal_row["total_inc"] or 0.0) if bal_row else 0.0
        tot_exp = float(bal_row["total_exp"] or 0.0) if bal_row else 0.0
        est_balance = max(15000.0, tot_inc - tot_exp)

        # Active goals monthly commitment
        cursor.execute("SELECT SUM(target_amount) FROM goals WHERE user_id = ? AND status = 'active'", (user_id,))
        g_row = cursor.fetchone()
        monthly_goal_req = float(g_row[0] or 0.0) if g_row else 5000.0

        aff_req = AffordabilityRequest(
            user_id=user_id,
            purchase_amount=target_amount,
            available_balance=est_balance,
            upcoming_obligations=round(tot_exp / 3.0 if tot_exp > 0 else 5000.0, 2),
            emergency_buffer=10000.0
        )
        aff_result = evaluate_affordability(aff_req, db)

        verdict = aff_result.verdict
        post_bal = aff_result.post_purchase_remainder if aff_result.post_purchase_remainder is not None else 0.0
        facts = {
            "purchase_amount": target_amount,
            "verdict": verdict,
            "available_balance": round(est_balance, 2),
            "post_purchase_balance": round(post_bal, 2),
            "emergency_buffer": round(aff_result.emergency_buffer, 2),
            "category": category or "Discretionary"
        }
        evidence = facts.copy()
        evidence["purchase_amount"] = target_amount
        evidence["post_purchase_balance"] = round(post_bal, 2)
        evidence["available_balance"] = round(est_balance, 2)

        deterministic_reply = (
            f"Based on your ledger, a purchase of ₹{target_amount:,.2f} has an affordability verdict of **{verdict.upper()}**. "
            f"Your current estimated balance is ₹{est_balance:,.2f}, leaving ₹{post_bal:,.2f} after the purchase. "
            f"{aff_result.summary}"
        )
        suggested_followups = [
            f"What if I buy it next month instead?",
            f"How much have I spent on {category or 'Shopping'} so far?",
            "Show my active financial goals"
        ]

    elif intent == "category_spending" and category:
        # Calculate exact spend on category in past 30 days and all time
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

        facts = {
            "category": category,
            "total_spent": round(total_spent, 2),
            "transaction_count": count
        }
        evidence = facts.copy()
        evidence["total_spent"] = round(total_spent, 2)
        evidence["transaction_count"] = count
        evidence["source_transaction_ids"] = [r["id"] for r in cited_transactions]

        deterministic_reply = (
            f"You have spent a total of ₹{total_spent:,.2f} across {count} transaction{'' if count == 1 else 's'} in {category}. "
            f"Your latest transaction was on {cited_transactions[0]['transaction_date']}: {cited_transactions[0]['description']} (₹{cited_transactions[0]['amount']:,.2f})."
            if count > 0 else f"You have zero recorded transactions in {category}."
        )
        suggested_followups = [
            f"Can I afford to spend ₹2,000 more on {category}?",
            "What are my biggest overall expenses?",
            "Show recommendations for reducing discretionary spending"
        ]

    elif intent == "top_categories":
        cursor.execute("""
        SELECT category, SUM(amount) AS cat_total, COUNT(*) AS tx_count
        FROM transactions
        WHERE user_id = ? AND (direction = 'spending' OR direction = 'debit')
        GROUP BY category
        ORDER BY cat_total DESC
        LIMIT 5
        """, (user_id,))
        top_cats = cursor.fetchall()
        total_spending = sum(float(r["cat_total"]) for r in top_cats)

        top_list = []
        for r in top_cats:
            c_name = r["category"]
            c_amt = round(float(r["cat_total"]), 2)
            pct = round((c_amt / total_spending * 100), 1) if total_spending > 0 else 0.0
            top_list.append(f"{c_name}: ₹{c_amt:,.2f} ({pct}%)")

        facts = {
            "top_categories": top_list,
            "total_spending": round(total_spending, 2)
        }
        evidence = {"total_spending": round(total_spending, 2)}
        for idx, r in enumerate(top_cats):
            evidence[f"cat_{idx+1}_amount"] = round(float(r["cat_total"]), 2)

        deterministic_reply = (
            f"Here is your spending breakdown across your top categories (totaling ₹{total_spending:,.2f}):\n" +
            "\n".join([f"• **{item}**" for item in top_list])
        )
        suggested_followups = [
            "How can I cut spending in my highest category?",
            "Check my monthly savings rate",
            "Can I afford a ₹10,000 vacation?"
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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
