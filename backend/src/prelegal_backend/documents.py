"""The documents Prelegal can draft, and the key terms the AI collects for each.

Each Common Paper template refers to defined terms (e.g. "Governing Law") whose values
belong on a separate Cover Page / Order Form / Key Terms page. This registry lists those
key terms with guidance for the AI, plus the two party roles. The Key Terms section of a
drafted document is rendered from it. A test checks that every defined term used in each
template is covered here.
"""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Uses camelCase JSON keys, like the frontend."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class FieldSpec(CamelModel):
    key: str
    label: str  # As used in the template, e.g. "Governing Law".
    description: str
    example: str = ""
    required: bool = True
    kind: Literal["text", "date"] = "text"  # Dates are stored as YYYY-MM-DD.


class DocumentSpec(CamelModel):
    id: str
    name: str
    description: str
    templates: list[str]  # /api/templates ids of the standard terms, in order.
    roles: tuple[str, str]  # What the template calls party 1 and party 2.
    fields: list[FieldSpec]

    def field(self, key: str) -> FieldSpec | None:
        return next((f for f in self.fields if f.key == key), None)


def _field(
    key: str,
    label: str,
    description: str,
    example: str = "",
    required: bool = True,
    kind: Literal["text", "date"] = "text",
) -> FieldSpec:
    return FieldSpec(
        key=key, label=label, description=description, example=example, required=required, kind=kind
    )


# ---------------------------------------------------------------------------
# Key terms shared by several documents

EFFECTIVE_DATE = _field(
    "effectiveDate", "Effective Date", "When the agreement takes effect.", kind="date"
)
GOVERNING_LAW = _field(
    "governingLaw", "Governing Law", "The state or country whose laws govern the agreement.", "Delaware"
)
CHOSEN_COURTS = _field(
    "chosenCourts",
    "Chosen Courts",
    "The courts where disputes about the agreement will be brought.",
    "The state and federal courts in New Castle County, Delaware",
)
GENERAL_CAP_AMOUNT = _field(
    "generalCapAmount",
    "General Cap Amount",
    "The maximum total liability of each party for most claims.",
    "The fees paid or payable in the 12 months before the claim",
)
INCREASED_CAP_AMOUNT = _field(
    "increasedCapAmount",
    "Increased Cap Amount",
    "A higher liability cap that applies to the Increased Claims, if any.",
    "3x the General Cap Amount",
    required=False,
)
INCREASED_CLAIMS = _field(
    "increasedClaims",
    "Increased Claims",
    "Types of claims subject to the Increased Cap Amount, if any.",
    "Breach of the data protection obligations",
    required=False,
)
UNLIMITED_CLAIMS = _field(
    "unlimitedClaims",
    "Unlimited Claims",
    "Types of claims with no liability cap, if any.",
    "Indemnification obligations",
    required=False,
)
ADDITIONAL_WARRANTIES = _field(
    "additionalWarranties",
    "Additional Warranties",
    "Any warranties beyond the standard ones, if any.",
    "Provider will maintain SOC 2 Type II certification",
    required=False,
)
SUBSCRIPTION_PERIOD = _field(
    "subscriptionPeriod", "Subscription Period", "How long each subscription lasts.", "1 year"
)
ORDER_DATE = _field(
    "orderDate", "Order Date", "When the order (and the subscription) starts.", kind="date"
)
NON_RENEWAL_NOTICE_DATE = _field(
    "nonRenewalNoticeDate",
    "Non-Renewal Notice Date",
    "The deadline to give notice to stop the subscription from renewing automatically.",
    "30 days before the end of the current Subscription Period",
)
SECURITY_POLICY = _field(
    "securityPolicy",
    "Security Policy",
    "The security standards or policy the Provider follows.",
    "SOC 2 Type II",
    required=False,
)


def _covered_claim(role: str, other: str, example: str) -> FieldSpec:
    return _field(
        f"{role.lower()}CoveredClaim",
        f"{role} Covered Claim",
        f"Third-party claims that the {role} must defend the {other} against (indemnify).",
        example,
    )


PROVIDER_COVERED_CLAIM = _covered_claim(
    "Provider",
    "Customer",
    "Claims that the Product infringes or misappropriates a third party's intellectual property",
)
CUSTOMER_COVERED_CLAIM = _covered_claim(
    "Customer",
    "Provider",
    "Claims arising from Customer Content or Customer's breach of the usage restrictions",
)

# ---------------------------------------------------------------------------
# Documents (ids match the catalog's template file names)

DOCUMENTS: list[DocumentSpec] = [
    DocumentSpec(
        id="mutual-nda",
        name="Mutual Non-Disclosure Agreement",
        description="Lets both parties share confidential information to evaluate or pursue a "
        "business relationship while protecting it from unauthorized use or disclosure.",
        templates=["mutual-nda"],
        roles=("Party 1", "Party 2"),
        fields=[
            _field(
                "purpose",
                "Purpose",
                "How Confidential Information may be used.",
                "Evaluating whether to enter into a business relationship with the other party",
            ),
            EFFECTIVE_DATE,
            _field(
                "mndaTerm",
                "MNDA Term",
                "How long the MNDA lasts: a number of years from the Effective Date, or until "
                "terminated.",
                "1 year from the Effective Date",
            ),
            _field(
                "termOfConfidentiality",
                "Term of Confidentiality",
                "How long Confidential Information stays protected: a number of years from the "
                "Effective Date (trade secrets for as long as they remain trade secrets), or in "
                "perpetuity.",
                "1 year from the Effective Date",
            ),
            # Like GOVERNING_LAW, but the MNDA's cover page asks for a US state.
            _field("governingLaw", "Governing Law", "The US state whose laws govern the MNDA.", "Delaware"),
            _field(
                "jurisdiction",
                "Jurisdiction",
                "The city or county and state whose courts hear disputes.",
                "New Castle, DE",
            ),
            _field(
                "modifications",
                "MNDA Modifications",
                "Any changes to the Standard Terms.",
                "None",
                required=False,
            ),
        ],
    ),
    DocumentSpec(
        id="csa",
        name="Cloud Service Agreement",
        description="Standard terms for selling and buying cloud software (SaaS): access, "
        "fees, privacy and security, warranties, liability, indemnification, and termination.",
        templates=["csa"],
        roles=("Provider", "Customer"),
        fields=[
            EFFECTIVE_DATE,
            ORDER_DATE,
            SUBSCRIPTION_PERIOD,
            NON_RENEWAL_NOTICE_DATE,
            _field(
                "fees",
                "Fees",
                "What the Customer pays for the subscription.",
                "$12,000 per year",
            ),
            _field(
                "paymentProcess",
                "Payment Process",
                "How and when the Customer pays.",
                "Annual invoice, due within 30 days",
            ),
            _field(
                "technicalSupport",
                "Technical Support",
                "The support the Provider gives during the subscription.",
                "Email support on business days, 9am-5pm Pacific",
            ),
            GENERAL_CAP_AMOUNT,
            PROVIDER_COVERED_CLAIM,
            CUSTOMER_COVERED_CLAIM,
            GOVERNING_LAW,
            CHOSEN_COURTS,
        ],
    ),
    DocumentSpec(
        id="sla",
        name="Service Level Agreement",
        description="Uptime and support commitments for a cloud service, with service credits "
        "when they are missed.",
        templates=["sla"],
        roles=("Provider", "Customer"),
        fields=[
            SUBSCRIPTION_PERIOD,
            _field(
                "targetUptime",
                "Target Uptime",
                "The monthly availability the Provider aims for.",
                "99.9%",
            ),
            _field(
                "uptimeCredit",
                "Uptime Credit",
                "The service credit the Customer gets when uptime falls below the Target Uptime.",
                "10% of the monthly Fees",
            ),
            _field(
                "targetResponseTime",
                "Target Response Time",
                "How quickly the Provider aims to respond to support requests.",
                "4 business hours",
            ),
            _field(
                "responseTimeCredit",
                "Response Time Credit",
                "The service credit the Customer gets when a response is late.",
                "5% of the monthly Fees per missed response",
            ),
            _field(
                "supportChannel",
                "Support Channel",
                "Where the Customer sends support requests.",
                "support@provider.com",
            ),
            _field(
                "scheduledDowntime",
                "Scheduled Downtime",
                "Planned maintenance windows that don't count against uptime.",
                "Up to 4 hours per month, announced 48 hours in advance",
                required=False,
            ),
        ],
    ),
    DocumentSpec(
        id="dpa",
        name="Data Processing Agreement",
        description="Terms for a provider's processing of customer personal data under GDPR "
        "and similar laws: subprocessors, security, audits, deletion, and data transfers.",
        templates=["dpa"],
        roles=("Provider", "Customer"),
        fields=[
            _field(
                "agreement",
                "Agreement",
                "The main agreement this DPA supplements.",
                "Cloud Service Agreement dated January 1, 2026",
            ),
            _field(
                "natureAndPurposeOfProcessing",
                "Nature and Purpose of Processing",
                "What processing the Provider does and why.",
                "Hosting and processing Customer data to provide the Service",
            ),
            _field(
                "categoriesOfPersonalData",
                "Categories of Personal Data",
                "The kinds of personal data processed.",
                "Names, email addresses, usage data",
            ),
            _field(
                "categoriesOfDataSubjects",
                "Categories of Data Subjects",
                "Whose personal data is processed.",
                "Customer's employees and end users",
            ),
            _field(
                "specialCategoryData",
                "Special Category Data",
                "Any sensitive data (health, biometric, etc.) processed, if any.",
                "None",
                required=False,
            ),
            _field(
                "specialCategoryDataRestrictions",
                "Special Category Data Restrictions or Safeguards",
                "Extra safeguards for Special Category Data, if any.",
                "Encrypted at rest; access limited to named staff",
                required=False,
            ),
            _field(
                "frequencyOfTransfer",
                "Frequency of Transfer",
                "How often personal data is transferred.",
                "Continuous",
            ),
            _field(
                "durationOfProcessing",
                "Duration of Processing",
                "How long the processing lasts.",
                "For the term of the Agreement",
            ),
            _field(
                "approvedSubprocessors",
                "Approved Subprocessors",
                "Subprocessors the Customer approves, with their location and tasks.",
                "Amazon Web Services (USA) - hosting",
            ),
            _field(
                "governingMemberState",
                "Governing Member State",
                "The EU member state whose law governs the Standard Contractual Clauses.",
                "Ireland",
            ),
            _field(
                "securityPolicy",
                "Security Policy",
                "The security standards the Provider is audited against.",
                "SOC 2 Type II",
            ),
            _field(
                "providerSecurityContact",
                "Provider Security Contact",
                "Where security requests and questionnaires go.",
                "security@provider.com",
            ),
        ],
    ),
    DocumentSpec(
        id="design-partner-agreement",
        name="Design Partner Agreement",
        description="An early-stage collaboration where a design partner gets access to a "
        "product in development and gives feedback to the provider.",
        templates=["design-partner-agreement"],
        roles=("Provider", "Partner"),
        fields=[
            EFFECTIVE_DATE,
            _field("term", "Term", "How long the design partnership lasts.", "6 months"),
            _field(
                "program",
                "Program",
                "What the design partner program involves.",
                "Monthly feedback sessions and early access to new features",
            ),
            _field(
                "fees",
                "Fees",
                "What the Partner pays, if anything.",
                "None",
                required=False,
            ),
            GOVERNING_LAW,
            CHOSEN_COURTS,
        ],
    ),
    DocumentSpec(
        id="psa",
        name="Professional Services Agreement",
        description="Engaging a provider for professional services and deliverables under "
        "statements of work (SOWs): fees, ownership of work product, warranties, and liability.",
        templates=["psa"],
        roles=("Provider", "Customer"),
        fields=[
            EFFECTIVE_DATE,
            _field(
                "deliverables",
                "Deliverables",
                "What the Provider will deliver under the SOW.",
                "A redesigned marketing website",
            ),
            _field("sowTerm", "SOW Term", "How long the SOW lasts.", "3 months"),
            _field("fees", "Fees", "What the Customer pays for the Services.", "$25,000, invoiced monthly"),
            _field(
                "paymentPeriod",
                "Payment Period",
                "How long the Customer has to pay each invoice.",
                "30 days from the invoice date",
            ),
            _field(
                "rejectionPeriod",
                "Rejection Period",
                "How long the Customer has to reject a Deliverable.",
                "10 business days",
            ),
            _field(
                "resubmissionPeriod",
                "Resubmission Period",
                "How long the Provider has to fix and resubmit a rejected Deliverable.",
                "10 business days",
            ),
            _field(
                "timeOfAssignment",
                "Time of Assignment",
                "When ownership of Deliverables passes to the Customer.",
                "Upon payment of the Fees for that Deliverable",
            ),
            _field(
                "customerObligations",
                "Customer Obligations",
                "What the Customer must provide, if anything.",
                "Timely access to staff and systems",
                required=False,
            ),
            _field(
                "customerPolicies",
                "Customer Policies",
                "Customer policies the Provider must follow, if any.",
                "Customer's vendor code of conduct",
                required=False,
            ),
            SECURITY_POLICY,
            _field(
                "insuranceMinimums",
                "Insurance Minimums",
                "Required insurance coverage, if any.",
                "$1M general liability",
                required=False,
            ),
            ADDITIONAL_WARRANTIES,
            GENERAL_CAP_AMOUNT,
            INCREASED_CAP_AMOUNT,
            INCREASED_CLAIMS,
            UNLIMITED_CLAIMS,
            PROVIDER_COVERED_CLAIM,
            CUSTOMER_COVERED_CLAIM,
            GOVERNING_LAW,
            CHOSEN_COURTS,
        ],
    ),
    DocumentSpec(
        id="partnership-agreement",
        name="Partnership Agreement",
        description="A business partnership between two companies: cooperation, payments, a "
        "mutual trademark license, confidentiality, and liability.",
        templates=["partnership-agreement"],
        roles=("Company", "Partner"),
        fields=[
            EFFECTIVE_DATE,
            _field(
                "endDate",
                "End Date",
                "When the partnership ends.",
                "2 years after the Effective Date",
            ),
            _field(
                "obligations",
                "Obligations",
                "What each party will do in the partnership.",
                "Company will list Partner in its marketplace; Partner will promote Company's product",
            ),
            _field(
                "territory",
                "Territory",
                "Where each party may use the other's brand.",
                "Worldwide",
            ),
            _field(
                "paymentProcess",
                "Payment Process",
                "How fees are billed, if any are paid.",
                "Monthly invoices",
                required=False,
            ),
            _field(
                "paymentSchedule",
                "Payment Schedule",
                "When fees are due, if any are paid.",
                "Within 30 days of the invoice",
                required=False,
            ),
            _field(
                "brandGuidelines",
                "Brand Guidelines",
                "Rules for using each other's brand, if any.",
                "Each party's published brand guidelines",
                required=False,
            ),
            ADDITIONAL_WARRANTIES,
            GENERAL_CAP_AMOUNT,
            INCREASED_CAP_AMOUNT,
            INCREASED_CLAIMS,
            UNLIMITED_CLAIMS,
            _covered_claim(
                "Company", "Partner", "Claims that Company's Brand Elements infringe third-party rights"
            ),
            _covered_claim(
                "Partner", "Company", "Claims that Partner's Brand Elements infringe third-party rights"
            ),
            GOVERNING_LAW,
            CHOSEN_COURTS,
        ],
    ),
    DocumentSpec(
        id="baa",
        name="Business Associate Agreement",
        description="HIPAA terms for how a provider may use, disclose, and safeguard protected "
        "health information (PHI) on behalf of a covered entity.",
        templates=["baa"],
        roles=("Provider", "Company"),
        fields=[
            _field(
                "agreement",
                "Agreement",
                "The main agreement this BAA supplements.",
                "Cloud Service Agreement dated January 1, 2026",
            ),
            _field("baaEffectiveDate", "BAA Effective Date", "When the BAA takes effect.", kind="date"),
            _field(
                "breachNotificationPeriod",
                "Breach Notification Period",
                "How quickly the Provider must report a breach of PHI.",
                "5 business days",
            ),
            _field(
                "limitations",
                "Limitations",
                "Limits on disclosing PHI to subcontractors or offshore, if any.",
                "No PHI may be stored or accessed outside the United States",
                required=False,
            ),
        ],
    ),
    DocumentSpec(
        id="software-license-agreement",
        name="Software License Agreement",
        description="Licensing on-premise or self-hosted software: license scope, restrictions, "
        "fees, warranties, indemnification, and liability.",
        templates=["software-license-agreement"],
        roles=("Provider", "Customer"),
        fields=[
            EFFECTIVE_DATE,
            ORDER_DATE,
            SUBSCRIPTION_PERIOD,
            NON_RENEWAL_NOTICE_DATE,
            _field(
                "permittedUses",
                "Permitted Uses",
                "What the Customer may use the software for.",
                "Internal business operations",
            ),
            _field(
                "licenseLimits",
                "License Limits",
                "Limits on the license, such as users or installations.",
                "Up to 100 named users",
            ),
            _field(
                "paymentProcess",
                "Payment Process",
                "How the Customer pays.",
                "Annual invoice, due within 30 days",
            ),
            _field(
                "warrantyPeriod",
                "Warranty Period",
                "How long the Provider warrants the software works as documented.",
                "90 days",
            ),
            _field(
                "deletionProcedure",
                "Deletion Procedure",
                "How the Customer removes the software when the license ends.",
                "Uninstall and certify deletion in writing within 30 days",
            ),
            ADDITIONAL_WARRANTIES,
            GENERAL_CAP_AMOUNT,
            INCREASED_CAP_AMOUNT,
            INCREASED_CLAIMS,
            UNLIMITED_CLAIMS,
            PROVIDER_COVERED_CLAIM,
            CUSTOMER_COVERED_CLAIM,
            GOVERNING_LAW,
            CHOSEN_COURTS,
        ],
    ),
    DocumentSpec(
        id="pilot-agreement",
        name="Pilot Agreement",
        description="A limited-time trial of a product so a customer can evaluate it before a "
        "full commercial agreement.",
        templates=["pilot-agreement"],
        roles=("Provider", "Customer"),
        fields=[
            EFFECTIVE_DATE,
            _field("pilotPeriod", "Pilot Period", "How long the pilot lasts.", "90 days"),
            GENERAL_CAP_AMOUNT,
            GOVERNING_LAW,
            CHOSEN_COURTS,
        ],
    ),
    DocumentSpec(
        id="ai-addendum",
        name="AI Addendum",
        description="An addendum to a services agreement covering AI services: inputs and "
        "outputs, and limits on training models with customer data.",
        templates=["ai-addendum"],
        roles=("Provider", "Customer"),
        fields=[
            _field(
                "trainingData",
                "Training Data",
                "Customer data the Provider may use to train models, if any. Leave empty to "
                "forbid training.",
                "Anonymized usage logs",
                required=False,
            ),
            _field(
                "trainingPurposes",
                "Training Purposes",
                "What the Provider may train models for, if training is allowed.",
                "Improving the Provider's AI features for all customers",
                required=False,
            ),
            _field(
                "trainingRestrictions",
                "Training Restrictions",
                "Limits on training, if any.",
                "No training on data from EU users",
                required=False,
            ),
            _field(
                "improvementRestrictions",
                "Improvement Restrictions",
                "Limits on using inputs and outputs to improve the AI system, if any.",
                "None",
                required=False,
            ),
        ],
    ),
]

REGISTRY: dict[str, DocumentSpec] = {spec.id: spec for spec in DOCUMENTS}

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("")
def list_documents() -> list[DocumentSpec]:
    return DOCUMENTS
