import { z } from 'zod';
import { 
  parseMismoDate,   
  parseMismoNumber, 
  parseMismoBoolean,
} from './transformers';

const AddressSchema = z.object({
  line1: z.string().optional(),
  unit: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional()
});

const PropertyDetailsSchema = z.object({
  type: z.string().optional(),
  usage: z.string().optional(),
  attachmentType: z.string().optional(),
  construction: z.string().optional(),
  estateType: z.string().optional(),
  yearBuilt: parseMismoNumber.optional(),
  financedUnits: z.string().optional(),
  floodInsuranceRequiredByLender: parseMismoBoolean.optional()
});

const AppraisalSchema = z.object({
  method: z.string().optional(),
  form: z.string().optional(),
  value: parseMismoNumber.optional(),
  effectiveDate: parseMismoDate.optional(),
  id: z.string().optional()
});

const ProjectSchema = z.object({
  name: z.string().optional(),
  legalStructure: z.string().optional(),
  classificationId: z.string().optional(),
  className: z.string().optional(),
  attachmentType: z.string().optional(),
  isPud: parseMismoBoolean.optional(),
  fnmaCpmProjectId: z.string().optional(),
  fnmaCpmCertId: z.string().optional()
});

const PropertySchema = z.object({
  address: AddressSchema.optional(),
  details: PropertyDetailsSchema.optional(),
  inSpecialFloodHazardArea: parseMismoBoolean.optional(),
  appraisal: AppraisalSchema.optional(),
  project: ProjectSchema.optional(),
  deedRestrictionTermMonths: parseMismoNumber.optional()
});

const LoanTermsSchema = z.object({
  purpose: z.string().optional(),
  refinanceType: z.string().optional(),
  purchasePrice: parseMismoNumber.optional(),
  noteAmount: parseMismoNumber.optional(),
  noteDate: parseMismoDate.optional(),
  noteRatePercent: parseMismoNumber.optional(),
  mortgageType: z.string().optional(),
  lienPriority: z.string().optional(),
  currentRatePercent: parseMismoNumber.optional(),
  amortizationType: z.string().optional(),
  termMonths: parseMismoNumber.optional(),
  maturityDate: parseMismoDate.optional(),
  initialPrincipalInterestPayment: parseMismoNumber.optional(),
  paymentFrequency: z.string().optional(),
  firstPaymentDate: parseMismoDate.optional(),
  lastPaidInstallmentDueDate: parseMismoDate.optional(),
  currentUPB: parseMismoNumber.optional(),
  currentPrincipalInterestPayment: parseMismoNumber.optional()
});

const LoanDetailsSchema = z.object({
  assumable: parseMismoBoolean.optional(),
  prepayPenalty: parseMismoBoolean.optional(),
  prepaymentPenalty: parseMismoBoolean.optional(),
  escrow: parseMismoBoolean.optional(),
  interestOnly: parseMismoBoolean.optional(),
  negativeAmortization: parseMismoBoolean.optional(),
  balloon: parseMismoBoolean.optional(),
  heloc: parseMismoBoolean.optional(),
  temporaryBuydown: parseMismoBoolean.optional(),
  applicationReceivedDate: parseMismoDate.optional(),
  borrowerCount: parseMismoNumber.optional(),
  totalMortgagedProperties: z.string().optional(),
  capitalizedLoan: parseMismoBoolean.optional(),
  constructionLoan: parseMismoBoolean.optional(),
  convertible: parseMismoBoolean.optional(),
  eNote: parseMismoBoolean.optional(),
  initialFixedMonths: parseMismoNumber.optional(),
  affordableLoan: parseMismoBoolean.optional(),
  relocationLoan: parseMismoBoolean.optional(),
  sharedEquity: parseMismoBoolean.optional(),
  mortgageModification: parseMismoBoolean.optional(),
  warehouseLender: parseMismoBoolean.optional(),
  remoteOnlineNotarization: parseMismoBoolean.optional()
});

const CalculationSchema = z.object({
  type: z.string().optional(),
  period: z.string().optional()
});

const LtvSchema = z.object({
  ltvRatioPercent: parseMismoNumber.optional(),
  baseLtvRatioPercent: parseMismoNumber.optional(),
  cltvRatioPercent: parseMismoNumber.optional()
});

const QualificationSchema = z.object({
  totalMonthlyIncome: parseMismoNumber.optional(),
  totalMonthlyDebt: parseMismoNumber.optional(),
  totalProposedHousingExpense: parseMismoNumber.optional(),
  totalMonthlyLiabilities: parseMismoNumber.optional(),
  housingRatioPercent: parseMismoNumber.optional(),
  totalDtiPercent: parseMismoNumber.optional(),
  borrowerReservesMonths: parseMismoNumber.optional()
});

const HmdaSchema = z.object({
  rateSpreadPercent: z.string().optional(),
  isHoepaLoan: parseMismoBoolean.optional()
});

const AusResultSchema = z.object({
  system: z.string().optional(),
  recommendation: z.string().optional(),
  caseId: z.string().optional()
});

const UnderwritingSchema = z.object({
  ausResults: z.array(AusResultSchema).optional(),
  isManual: parseMismoBoolean.optional(),
  loanLevelCreditScore: z.string().optional(),
  scoreSelectionMethod: z.string().optional(),
  priceLockDateTime: parseMismoDate.optional()
});

const RoundingRuleSchema = z.object({
  type: z.string().optional(),
  percent: parseMismoNumber.optional()
});

const PeriodicCapsSchema = z.object({
  type: z.string().optional(),
  maxIncreasePercent: parseMismoNumber.optional(),
  maxDecreasePercent: parseMismoNumber.optional(),
  frequencyMonths: parseMismoNumber.optional(),
  firstEffectiveDateForRuleType: parseMismoDate.optional()
});

const ArmSchema = z.object({
  initialFixedMonths: parseMismoNumber.optional(),
  lifetimeCapPercent: parseMismoNumber.optional(),
  lifetimeFloorPercent: parseMismoNumber.optional(),
  marginPercent: parseMismoNumber.optional(),
  firstRateChangePaymentEffectiveDate: parseMismoDate.optional(),
  roundingRule: RoundingRuleSchema.optional(),
  indexSourceType: z.string().optional(),
  indexSourceDescription: z.string().optional(),
  indexLookbackDays: parseMismoNumber.optional(),
  disclosedIndexRatePercent: parseMismoNumber.optional(),
  periodicCaps: z.array(PeriodicCapsSchema).optional(),
  nextRateAdjustmentEffectiveDate: parseMismoDate.optional()
});

const BuydownSchema = z.object({
  durationMonths: parseMismoNumber.optional(),
  initialDiscountPercent: parseMismoNumber.optional(),
  changeFrequencyMonths: parseMismoNumber.optional(),
  increaseRatePercent: parseMismoNumber.optional(),
  contributors: z.array(z.string()).optional(),
  fundsCollectedAmount: parseMismoNumber.optional(),
});

const EscrowItemSchema = z.object({
  type: z.string().optional(),
  monthlyAmount: z.string().optional()
});

const EscrowSchema = z.object({
  currentBalance: z.string().optional(),
  items: z.array(EscrowItemSchema).optional()
});

const MiSchema = z.object({
  isAbsent: parseMismoBoolean.optional(),
  absenceReason: z.string().optional(),
  company: z.string().optional(),
  certificateId: z.string().optional(),
  coveragePercent: z.string().optional(),
  premiumSource: z.string().optional(),
  isPremiumFinanced: parseMismoBoolean.optional(),
  premiumPlanType: z.string().optional(),
  rateAdjustmentPercent: z.string().optional()
}).optional().default({});

const BorrowerNameSchema = z.object({
  first: z.string().optional(),
  middle: z.string().optional(),
  last: z.string().optional(),
  suffix: z.string().optional()
});

const BorrowerMailingAddressSchema = z.object({
  line1: z.string().optional(),
  unit: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional()
});

const BorrowerDeclarationsSchema = z.object({
  intentToOccupy: z.string().optional(),
  citizenship: z.string().optional(),
  bankruptcy: parseMismoBoolean.optional(),
  foreclosure: parseMismoBoolean.optional(),
  ownership: parseMismoBoolean.optional(),
  firstTimeHomebuyer: parseMismoBoolean.optional()
});

const CreditScoreSchema = z.object({
  repository: z.string().optional(),
  score: z.string().optional(),
  reportId: z.string().optional()
});

const EthnicityTypeSchema = z.object({
  type: z.string()
});

const RaceTypeSchema = z.object({
  type: z.string(),
  otherDescription: z.string().optional()
});

const GenderSchema = z.object({
  type: z.string().optional(),
  collectedByObservation: parseMismoBoolean.optional(),
  refused: parseMismoBoolean.optional()
});

const HmdaDemographicsSchema = z.object({
  ethnicity: z.array(EthnicityTypeSchema).optional(),
  ethnicityOrigins: z.array(z.string()).optional(),
  ethnicityCollectedByObservation: parseMismoBoolean.optional(),
  ethnicityRefused: parseMismoBoolean.optional(),
  race: z.array(RaceTypeSchema).optional(),
  raceCollectedByObservation: parseMismoBoolean.optional(),
  raceRefused: parseMismoBoolean.optional(),
  gender: GenderSchema.optional()
});

const BorrowerSchema = z.object({
  name: BorrowerNameSchema.optional(),
  classification: z.string().optional(),
  ssnLast4: z.string().optional(),
  dob: parseMismoDate.optional(),
  ageAtApplication: z.string().optional(),
  qualifyingIncome: parseMismoNumber.optional(),
  mailToAddressSameAsProperty: parseMismoBoolean.optional(),
  mailingAddress: BorrowerMailingAddressSchema.optional(),
  declarations: BorrowerDeclarationsSchema.optional(),
  creditScores: z.array(CreditScoreSchema).optional(),
  isSelfEmployed: parseMismoBoolean.optional(),
  hmdaDemographics: HmdaDemographicsSchema.optional()
});

const OriginatorSchema = z.object({
  id: z.string(),
  type: z.string()
});

const OtherPartySchema = z.object({
  description: z.string(),
  id: z.string()
});

const PartySchema = z.object({
  role: z.string().optional(),
  partyId: z.string().optional(),
  name: z.string().optional()
});

const DeliveryServicingSchema = z.object({
  investorOwnershipPercent: parseMismoNumber.optional(),
  investorRemittanceType: z.string().optional(),
  investorProductPlanId: z.string().optional(),
  investorFeatureCodes: z.array(z.string()).optional(),
  mersRegistrationStatus: z.string().optional(),
  delinquentPaymentsLast12Months: parseMismoNumber.optional(),
  servicingTransferEffectiveDate: parseMismoDate.optional(),
  loanStateAtClosingDate: parseMismoDate.optional(),
  loanStateCurrentDate: parseMismoDate.optional()
});

const MetaSchema = z.object({
  mismoVersion: z.string(),
  createdDate: parseMismoDate,
  generationTimestamp: parseMismoDate
});

const LoanSchema = z.object({
    loanRole: z.string().optional(),
    loanState: z.string().optional(),
    terms: LoanTermsSchema.optional(),
    details: LoanDetailsSchema.optional(),
    calculation: CalculationSchema.optional(),
    ltv: LtvSchema.optional(),
    qualification: QualificationSchema.optional(),
    hmda: HmdaSchema.optional(),
    underwriting: UnderwritingSchema.optional(),
    arm: ArmSchema.optional(),
    buydown: BuydownSchema.optional(),
    escrow: EscrowSchema.optional(),
    mi: MiSchema.optional(),
    deliveryServicing: DeliveryServicingSchema.optional(),
  });

// Main LoanApplication schema
const LoanApplicationSchema = z.object({
  loanIdentifier: z.string().optional(),
  version: parseMismoNumber.optional(),
  fileName: z.string().optional(),
  receivedAt: parseMismoDate.optional(),
  meta: MetaSchema.optional(),
  property: PropertySchema.optional(),
  loans: z.array(LoanSchema).optional(),
  borrowers: z.array(BorrowerSchema).optional(),
  parties: z.array(PartySchema).optional()
});

export {
  AddressSchema,
  PropertyDetailsSchema,
  AppraisalSchema,
  ProjectSchema,
  PropertySchema,
  LoanTermsSchema,
  LoanDetailsSchema,
  CalculationSchema,
  LtvSchema,
  QualificationSchema,
  HmdaSchema,
  AusResultSchema,
  UnderwritingSchema,
  RoundingRuleSchema,
  PeriodicCapsSchema,
  ArmSchema,
  BuydownSchema,
  EscrowItemSchema,
  EscrowSchema,
  MiSchema,
  BorrowerNameSchema,
  BorrowerMailingAddressSchema,
  BorrowerDeclarationsSchema,
  CreditScoreSchema,
  EthnicityTypeSchema,
  RaceTypeSchema,
  GenderSchema,
  HmdaDemographicsSchema,
  BorrowerSchema,
  OriginatorSchema,
  OtherPartySchema,
  DeliveryServicingSchema,
  MetaSchema,
  LoanSchema,
  PartySchema,
  LoanApplicationSchema
}; 