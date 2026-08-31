from app.db.models import PaperStatus, UserRole

ALLOWED_TRANSITIONS = {
    PaperStatus.DRAFT: [PaperStatus.SUBMITTED],
    PaperStatus.SUBMITTED: [PaperStatus.UNDER_REVIEW, PaperStatus.APPROVED, PaperStatus.REJECTED, PaperStatus.DRAFT],
    PaperStatus.UNDER_REVIEW: [PaperStatus.APPROVED, PaperStatus.REJECTED],
    PaperStatus.REJECTED: [PaperStatus.DRAFT, PaperStatus.SUBMITTED], # Paper setter can revise
    PaperStatus.APPROVED: [PaperStatus.SCHEDULED],
    PaperStatus.SCHEDULED: [PaperStatus.RELEASED],
    PaperStatus.RELEASED: [PaperStatus.PRINTED],
    PaperStatus.PRINTED: [] # Terminal state
}

ROLE_PERMITTED_TRANSITIONS = {
    UserRole.PAPER_SETTER: [
        (PaperStatus.DRAFT, PaperStatus.SUBMITTED),
        (PaperStatus.SUBMITTED, PaperStatus.DRAFT),
        (PaperStatus.REJECTED, PaperStatus.DRAFT),
        (PaperStatus.REJECTED, PaperStatus.SUBMITTED),
    ],
    UserRole.MODERATOR: [
        (PaperStatus.SUBMITTED, PaperStatus.UNDER_REVIEW),
        (PaperStatus.SUBMITTED, PaperStatus.APPROVED),
        (PaperStatus.SUBMITTED, PaperStatus.REJECTED),
        (PaperStatus.UNDER_REVIEW, PaperStatus.APPROVED),
        (PaperStatus.UNDER_REVIEW, PaperStatus.REJECTED),
    ],
    UserRole.EXAM_CONTROLLER: [
        (PaperStatus.APPROVED, PaperStatus.SCHEDULED),
        (PaperStatus.SCHEDULED, PaperStatus.RELEASED),
    ],
    UserRole.PRINTING_STAFF: [
        (PaperStatus.RELEASED, PaperStatus.PRINTED),
    ],
    UserRole.ADMIN: [
        # Admin can override transitions if necessary for administrative recovery
        (PaperStatus.DRAFT, PaperStatus.SUBMITTED),
        (PaperStatus.SUBMITTED, PaperStatus.UNDER_REVIEW),
        (PaperStatus.SUBMITTED, PaperStatus.APPROVED),
        (PaperStatus.SUBMITTED, PaperStatus.REJECTED),
        (PaperStatus.UNDER_REVIEW, PaperStatus.APPROVED),
        (PaperStatus.UNDER_REVIEW, PaperStatus.REJECTED),
        (PaperStatus.REJECTED, PaperStatus.DRAFT),
        (PaperStatus.APPROVED, PaperStatus.SCHEDULED),
        (PaperStatus.SCHEDULED, PaperStatus.RELEASED),
        (PaperStatus.RELEASED, PaperStatus.PRINTED),
    ]
}

def is_valid_transition(current_status: PaperStatus, new_status: PaperStatus, user_role: UserRole) -> (bool, str):
    """
    Validates whether transitioning from current_status to new_status is valid according to
    the paper state machine and permitted for the requesting user's role.
    """
    if current_status not in ALLOWED_TRANSITIONS:
        return False, f"Unknown initial status: {current_status}"

    if new_status not in ALLOWED_TRANSITIONS[current_status]:
        return False, f"Illegal state transition from {current_status.value} to {new_status.value}."

    permitted_tuples = ROLE_PERMITTED_TRANSITIONS.get(user_role, [])
    if (current_status, new_status) not in permitted_tuples:
        return False, f"Role {user_role.value} is not authorized to transition paper from {current_status.value} to {new_status.value}."

    return True, "Valid transition"
