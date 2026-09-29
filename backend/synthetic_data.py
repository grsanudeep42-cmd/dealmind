"""
synthetic_data.py — Pre-load the Acme Corp deal into Hindsight.

Run once at startup (idempotent — Hindsight de-duplicates by document_id).
Each call is a separate document_id so recall/reflect can cite the exact call.
"""

from __future__ import annotations

import logging
from typing import NamedTuple

from hindsight_bridge import retain

_logger = logging.getLogger(__name__)

DEAL_ID = "acme-corp-deal"
DEAL_NAME = "Acme Corp — Vector DB Platform ($480K ARR)"

# ---------------------------------------------------------------------------
# The 5 call transcripts
# ---------------------------------------------------------------------------

class CallRecord(NamedTuple):
    call_number: int
    week: int
    document_id: str
    content: str


ACME_CALLS: list[CallRecord] = [
    CallRecord(
        call_number=1,
        week=1,
        document_id="acme-call-1",
        content="""
Deal: Acme Corp — Vector DB Platform ($480K ARR)
Call #1 — Week 1 — Initial Discovery
Attendees: Dave Chen (VP Engineering, Acme Corp), Sales Rep

Summary:
- Dave Chen expressed strong interest in replacing their existing Pinecone setup.
  Current pain points: cost unpredictability and lack of dedicated infrastructure.
- Budget has been approved for Q4 at $480,000 ARR.
- Dave explicitly stated they want a dedicated deployment, not a shared SaaS model.
  Quote: "We can't have our embeddings sitting in a shared cluster with other companies."
- Initial technical fit looks strong. Agreed to a technical deep dive in 2 weeks.
- No competitive alternatives mentioned yet.
- Next step: Schedule technical deep dive with Dave and his engineering team.
        """.strip(),
    ),
    CallRecord(
        call_number=2,
        week=3,
        document_id="acme-call-2",
        content="""
Deal: Acme Corp — Vector DB Platform ($480K ARR)
Call #2 — Week 3 — InfoSec Review
Attendees: Priya Sharma (Head of Information Security, Acme Corp), Sales Rep

Summary:
- Priya Sharma is the primary InfoSec gatekeeper. Her sign-off is mandatory before any contract can proceed.
- Raised CONCERN #1: GDPR data residency. Acme Corp processes EU customer data and requires that all data 
  remain within EU data centres. Priya stated: "This is a hard requirement. If you can't guarantee EU-only 
  data residency, we're done." 
- Raised CONCERN #2: Encryption at rest. Requires AES-256 minimum encryption at rest for all stored vectors 
  and associated metadata.
- Rejected shared multi-tenant cluster architecture outright. Quote from Priya: "A shared cluster is an 
  automatic no from InfoSec. We had a data leak at a previous vendor because of multi-tenant issues."
- Action item: Provide formal documentation on EU data residency guarantees and encryption standards.
- Next step: InfoSec to review documentation. Schedule follow-up in 4 weeks.
        """.strip(),
    ),
    CallRecord(
        call_number=3,
        week=5,
        document_id="acme-call-3",
        content="""
Deal: Acme Corp — Vector DB Platform ($480K ARR)
Call #3 — Week 5 — Technical Deep Dive
Attendees: Dave Chen (VP Engineering, Acme Corp), Technical Lead (Acme Corp), Sales Engineer

Summary:
- Detailed technical architecture review.
- Dave Chen explicitly rejected shared multi-tenant clusters again during technical discussion. 
  Confirmed that InfoSec and Engineering are aligned on this point.
- Both parties agreed on dedicated VPC deployment model as the architecture of choice.
  Dave: "A dedicated VPC deployment is the only model that works for us technically and from a security standpoint."
- Competitor mention: Weaviate came up as an alternative they are actively evaluating. 
  Dave said: "We've had a demo with Weaviate last week. Their self-hosted option is interesting."
- Our differentiators discussed: managed dedicated VPC vs Weaviate's self-managed overhead, 
  enterprise SLA, and built-in monitoring.
- Performance benchmarks reviewed — our latency numbers were 40% better than their current Pinecone setup.
- Next step: Commercial proposal to go to CFO Robert Walsh.
        """.strip(),
    ),
    CallRecord(
        call_number=4,
        week=7,
        document_id="acme-call-4",
        content="""
Deal: Acme Corp — Vector DB Platform ($480K ARR)
Call #4 — Week 7 — Security Review Follow-Up
Attendees: Priya Sharma (Head of Information Security, Acme Corp), Sales Rep, Solutions Engineer

Summary:
- Priya Sharma escalated the encryption concern to also include in-transit encryption.
  Quote: "I need TLS 1.2 minimum for all data in transit, and I need that in writing."
- Priya asked specifically about SOC 2 Type II certification. 
  We confirmed: fully SOC 2 Type II compliant. Certification documentation shared.
- GDPR data residency documentation was reviewed and accepted by Priya. 
  She confirmed: "The EU data residency guarantee is acceptable."
- Encryption at rest (AES-256) documentation accepted.
- Remaining open item: formal written confirmation of in-transit encryption (TLS 1.2+).
- Priya's overall assessment: "InfoSec concerns are largely addressed. I'll give conditional approval 
  pending the in-transit encryption documentation."
- Next step: Legal to prepare contract amendment covering dedicated VPC deployment terms.
        """.strip(),
    ),
    CallRecord(
        call_number=5,
        week=9,
        document_id="acme-call-5",
        content="""
Deal: Acme Corp — Vector DB Platform ($480K ARR)
Call #5 — Week 9 — Commercial Negotiation
Attendees: Robert Walsh (CFO, Acme Corp), Sales Rep, Account Executive

Summary:
- Original proposal price: $520,000 ARR.
- Robert Walsh negotiated hard on price. Final agreed price: $480,000 ARR (7.7% discount).
  Walsh: "We can do $480K but that's my absolute ceiling."
- Payment terms agreed: annual upfront payment. No monthly or quarterly option.
- Pre-approved contract amendment added to the agreement: 
  Amendment reference AMD-2024-047 covers dedicated VPC deployment terms and EU data residency 
  guarantees. This amendment was pre-approved by legal and covers Priya Sharma's GDPR and 
  dedicated deployment requirements.
- In-transit encryption (TLS 1.2+) formally included in AMD-2024-047.
- Contract status: Draft sent to Acme Corp legal team for review.
- Expected close: End of Q4.
- Next step: Legal review by Acme Corp, then signature.
        """.strip(),
    ),
]


# ---------------------------------------------------------------------------
# Seed function
# ---------------------------------------------------------------------------

async def seed_acme_deal() -> dict:
    """
    Ingest all 5 Acme Corp call transcripts into Hindsight.

    Idempotent — retaining the same document_id again updates it in place.
    Returns a summary dict with per-call success/failure.
    """
    results: dict[str, bool] = {}

    _logger.info("synthetic_data: seeding %d calls for deal=%s", len(ACME_CALLS), DEAL_ID)

    for call in ACME_CALLS:
        _logger.info(
            "synthetic_data: retaining call #%d (week %d) doc_id=%s",
            call.call_number, call.week, call.document_id,
        )
        ok = await retain(
            bank_id=DEAL_ID,
            content=call.content,
            document_id=call.document_id,
        )
        results[call.document_id] = ok
        if not ok:
            _logger.error(
                "synthetic_data: FAILED to retain call #%d — doc_id=%s",
                call.call_number, call.document_id,
            )

    success_count = sum(1 for v in results.values() if v)
    _logger.info(
        "synthetic_data: seeding complete — %d/%d calls retained successfully",
        success_count, len(ACME_CALLS),
    )

    return {
        "deal_id": DEAL_ID,
        "deal_name": DEAL_NAME,
        "calls_attempted": len(ACME_CALLS),
        "calls_succeeded": success_count,
        "per_call": results,
    }


# Expose call metadata so the frontend can label memory sources
CALL_METADATA: dict[str, dict] = {
    # Acme Corp
    "acme-call-1": {"call_number": 1, "week": 1, "attendees": ["Dave Chen (VP Engineering)"], "topic": "Initial Discovery"},
    "acme-call-2": {"call_number": 2, "week": 3, "attendees": ["Priya Sharma (InfoSec)"], "topic": "InfoSec Review"},
    "acme-call-3": {"call_number": 3, "week": 5, "attendees": ["Dave Chen (VP Engineering)"], "topic": "Technical Deep Dive"},
    "acme-call-4": {"call_number": 4, "week": 7, "attendees": ["Priya Sharma (InfoSec)"], "topic": "Security Review Follow-Up"},
    "acme-call-5": {"call_number": 5, "week": 9, "attendees": ["Robert Walsh (CFO)"], "topic": "Commercial Negotiation"},
    # NovaTech
    "novatech-call-1": {"call_number": 1, "week": 1, "attendees": ["Marcus Webb (VP Engineering)"], "topic": "Initial Discovery"},
    "novatech-call-2": {"call_number": 2, "week": 3, "attendees": ["Sarah Kim (InfoSec Lead)"], "topic": "InfoSec Review"},
    "novatech-call-3": {"call_number": 3, "week": 5, "attendees": ["Marcus Webb (VP Engineering)"], "topic": "Technical Deep Dive"},
    "novatech-call-4": {"call_number": 4, "week": 7, "attendees": ["CFO (Finance)"], "topic": "Commercial Negotiation"},
}


# ---------------------------------------------------------------------------
# NovaTech deal
# ---------------------------------------------------------------------------

NOVATECH_DEAL_ID   = "novatech-deal"
NOVATECH_DEAL_NAME = "NovaTech — ML Infrastructure Platform ($320K ARR)"

NOVATECH_CALLS: list[CallRecord] = [
    CallRecord(
        call_number=1,
        week=1,
        document_id="novatech-call-1",
        content="""
Deal: NovaTech — ML Infrastructure Platform ($320K ARR)
Call #1 — Week 1 — Initial Discovery
Attendees: Marcus Webb (VP Engineering, NovaTech), Sales Rep

Summary:
- Marcus Webb wants to replace their self-hosted Weaviate setup.
  Current pain points: maintenance overhead, no SLA, on-call burden for engineering team.
  Quote: "We're spending 20% of two engineers' time keeping Weaviate alive. That's unacceptable at our scale."
- Budget ceiling approved by finance: $320,000 ARR. Hard ceiling — Marcus confirmed no flexibility.
- Marcus stated their ML team is building real-time recommendation systems requiring low-latency vector search.
- Data sensitivity: NovaTech is headquartered in Germany, processes EU customer data (GDPR applies).
- Pinecone was mentioned as an alternative they have evaluated. Marcus: "Pinecone's cost model doesn't work for us at scale."
- Preferred deployment: Marcus expressed preference for managed service but noted InfoSec will have requirements.
- Next step: Schedule InfoSec review with Sarah Kim in 2 weeks.
        """.strip(),
    ),
    CallRecord(
        call_number=2,
        week=3,
        document_id="novatech-call-2",
        content="""
Deal: NovaTech — ML Infrastructure Platform ($320K ARR)
Call #2 — Week 3 — InfoSec Review
Attendees: Sarah Kim (InfoSec Lead, NovaTech), Sales Rep

Summary:
- Sarah Kim is NovaTech's InfoSec gatekeeper. No contract proceeds without her approval.
- Raised CONCERN #1: Encryption at rest. NovaTech's security policy mandates AES-256 encryption
  at rest for all customer data including ML embeddings and metadata. Non-negotiable.
- Raised CONCERN #2: GDPR data residency. As a German-headquartered company processing EU citizen
  data, all data must remain within EU data centres. Sarah: "We've had a DPA audit last year.
  EU data residency is not optional — it's a legal requirement for us."
- Rejected shared multi-tenant infrastructure categorically. 
  Quote: "We cannot have our customer embeddings co-located with other companies' data.
  We saw what happened to a competitor who used shared infrastructure — it's not a risk we'll take."
- Requested formal documentation: SOC 2 Type II and ISO 27001 certifications required.
- Action item: Provide EU data residency guarantee documentation and encryption certification.
- Next step: InfoSec to review documentation. Technical deep-dive with Marcus in 2 weeks.
        """.strip(),
    ),
    CallRecord(
        call_number=3,
        week=5,
        document_id="novatech-call-3",
        content="""
Deal: NovaTech — ML Infrastructure Platform ($320K ARR)
Call #3 — Week 5 — Technical Deep Dive
Attendees: Marcus Webb (VP Engineering, NovaTech), ML Team Lead (NovaTech), Sales Engineer

Summary:
- Detailed technical architecture walkthrough.
- Marcus and team confirmed dedicated deployment is required — aligned with Sarah Kim's InfoSec position.
  Marcus: "Sarah has been very clear. Dedicated deployment only. We're fully aligned on that."
- Agreed on dedicated VPC deployment model. Marcus appreciated the managed SLA and monitoring.
- Competitor evaluation update: Pinecone ruled out due to cost structure at NovaTech's query volume.
  Marcus: "Pinecone would cost us $600K+ at our query volume. That's double our budget."
- Technical benchmarks reviewed: latency profiles meet NovaTech's P99 SLA requirements.
- Integration approach agreed: REST API initially, with gRPC migration path for future scale.
- EU data residency documentation submitted and provisionally accepted by Marcus's team.
- Next step: Commercial discussion with CFO to finalise pricing within $320K ceiling.
        """.strip(),
    ),
    CallRecord(
        call_number=4,
        week=7,
        document_id="novatech-call-4",
        content="""
Deal: NovaTech — ML Infrastructure Platform ($320K ARR)
Call #4 — Week 7 — Commercial Negotiation
Attendees: CFO (NovaTech), Marcus Webb (VP Engineering, NovaTech), Account Executive

Summary:
- CFO confirmed the $320,000 ARR budget ceiling is absolute. No exceptions, board-approved number.
  CFO: "Marcus knows the number. $320K is what we have. Make it work or we walk."
- Payment terms: Annual upfront — CFO preferred for budget cycle alignment.
- Agreed commercial terms: $320,000 ARR, annual upfront, dedicated VPC deployment.
- Contract amendment prepared: covers EU data residency, AES-256 encryption at rest, dedicated VPC,
  SOC 2 Type II compliance confirmation, and TLS 1.2+ in-transit encryption.
- Sarah Kim gave conditional approval pending receipt of signed amendment.
- InfoSec sign-off path: Sarah requires the amendment countersigned by our legal team.
- Expected close: Within 3 weeks pending legal review on both sides.
- Next step: Legal review, Sarah Kim final sign-off, signature.
        """.strip(),
    ),
]


async def seed_novatech_deal() -> dict:
    """
    Ingest all 4 NovaTech call transcripts into Hindsight.
    Idempotent — same document_id retaining updates in place.
    """
    results: dict[str, bool] = {}
    _logger.info("synthetic_data: seeding %d calls for deal=%s", len(NOVATECH_CALLS), NOVATECH_DEAL_ID)

    for call in NOVATECH_CALLS:
        _logger.info(
            "synthetic_data: retaining novatech call #%d (week %d) doc_id=%s",
            call.call_number, call.week, call.document_id,
        )
        ok = await retain(
            bank_id=NOVATECH_DEAL_ID,
            content=call.content,
            document_id=call.document_id,
        )
        results[call.document_id] = ok
        if not ok:
            _logger.error(
                "synthetic_data: FAILED to retain novatech call #%d doc_id=%s",
                call.call_number, call.document_id,
            )

    success_count = sum(1 for v in results.values() if v)
    _logger.info(
        "synthetic_data: novatech seeding complete — %d/%d calls retained",
        success_count, len(NOVATECH_CALLS),
    )
    return {
        "deal_id": NOVATECH_DEAL_ID,
        "deal_name": NOVATECH_DEAL_NAME,
        "calls_attempted": len(NOVATECH_CALLS),
        "calls_succeeded": success_count,
        "per_call": results,
    }
