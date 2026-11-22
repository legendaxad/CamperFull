import { Banknote, Camera, ClipboardCheck, FileText, MapPin, Settings2, Sparkles, type LucideIcon } from 'lucide-react'
import type { WizardStepId } from '@/features/publishing/publishingTypes'

export interface WizardStepMeta {
  id: WizardStepId
  title: string
  short: string
  description: string
  icon: LucideIcon
}

/** Order matters — it matches WIZARD_STEP_IDS. */
export const WIZARD_STEPS: WizardStepMeta[] = [
  { id: 'basics', title: 'Basic information', short: 'Basics', icon: FileText, description: 'Tell travellers what you are offering.' },
  { id: 'specs', title: 'Technical specifications', short: 'Specs', icon: Settings2, description: 'Dimensions, engine and registration details.' },
  { id: 'features', title: 'Equipment & features', short: 'Features', icon: Sparkles, description: 'Select everything travellers can use on board.' },
  { id: 'photos', title: 'Photos & media', short: 'Photos', icon: Camera, description: 'Great photos are the #1 reason campers get booked.' },
  { id: 'location', title: 'Location', short: 'Location', icon: MapPin, description: 'Where travellers pick up and return the camper.' },
  { id: 'pricing', title: 'Pricing & availability', short: 'Pricing', icon: Banknote, description: 'Set your rates, discounts and the dates you can host.' },
  { id: 'preview', title: 'Preview & publish', short: 'Preview', icon: ClipboardCheck, description: 'Check everything before your listing goes live.' },
]

/** Every step renders its own <form> with this id; the shared footer submits it. */
export const STEP_FORM_ID = 'publishing-step-form'
