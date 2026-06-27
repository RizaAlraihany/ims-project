const TRANSFER_DRAFT_KEY = 'ims_transfer_draft'

export function getTransferDraft() {
  const rawDraft = sessionStorage.getItem(TRANSFER_DRAFT_KEY)
  return rawDraft ? JSON.parse(rawDraft) : null
}

export function setTransferDraft(draft) {
  sessionStorage.setItem(TRANSFER_DRAFT_KEY, JSON.stringify(draft))
}

export function clearTransferDraft() {
  sessionStorage.removeItem(TRANSFER_DRAFT_KEY)
}
