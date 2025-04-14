import { z } from 'zod';
import { XmlObject, getValue, getDirectValue } from './xmlHelpers';
import {
  LoanApplicationSchema,
  PropertySchema,
  AddressSchema,
  PropertyDetailsSchema,
  AppraisalSchema,
  ProjectSchema,
  LoanSchema,
  LoanTermsSchema,
  LoanDetailsSchema,
  ArmSchema,
  QualificationSchema,
  UnderwritingSchema,
  LtvSchema,
  CalculationSchema,
  BuydownSchema,
  EscrowSchema,
  EscrowItemSchema,
  MiSchema,
  DeliveryServicingSchema,
  PartiesAndIdsSchema,
  BorrowerSchema,
} from './schemas';

/**
 * Extract structured loan data from XML object
 */
export function extractLoanSummaryData(xmlObject: XmlObject): z.infer<typeof LoanApplicationSchema> {
    const message = xmlObject.MESSAGE;
    if (!message) throw new Error("MESSAGE root element not found.");

    const dealSet = getValue(message, ['DEAL_SETS', 'DEAL_SET']);
    const deal = getValue(dealSet, ['DEALS', 'DEAL']);
    const parties = getValue(deal, ['PARTIES', 'PARTY']); // Array or single object
    const loans = getValue(deal, ['LOANS', 'LOAN']); // Array or single object
    // Meta
    const aboutVersion = getValue(message, ['ABOUT_VERSIONS', 'ABOUT_VERSION']);
    let mismoVersion = '';
    let createdDate = new Date();
    if (aboutVersion) {
        mismoVersion = getDirectValue(aboutVersion, 'AboutVersionIdentifier');
        createdDate = getDirectValue(aboutVersion, 'CreatedDatetime');
    }
    if (!deal || !parties || !loans) {
        throw new Error("Essential DEAL, PARTIES, or LOANS structure not found or is empty.");
    }

    const rawData: z.infer<typeof LoanApplicationSchema> = {
        receivedAt: new Date(),
        meta: {
            mismoVersion,
            createdDate,
            generationTimestamp: new Date()
        },
        property: {
            address: {},
            details: {},
            inSpecialFloodHazardArea: false,
            appraisal: {},
            project: {},
        },
        loans: [],
        borrowers: [],
    };

    const loanInApplications: z.infer<typeof LoanSchema>[] = [];
    const loanArray = Array.isArray(loans) ? loans : [loans];

    loanArray.forEach(loan => {
        let loanObject: z.infer<typeof LoanSchema> = {};
        loanObject.details = {};
        loanObject.terms = {};
        loanObject.calculation = {};
        loanObject.ltv = {};
        loanObject.qualification = {};
        loanObject.hmda = {};
        loanObject.underwriting = {};
        loanObject.mi = {};
        loanObject.buydown = {};
        loanObject.escrow = {};
        loanObject.deliveryServicing = {};
        if (loan.$?.LoanRoleType === 'SubjectLoan') {
            const loanStateType = getValue(loan, ['LOAN_STATE', 'LoanStateType'], null);
            loanObject.loanState = loanStateType;
            loanObject.loanRole = loan.$?.LoanRoleType;

            // Process loan terms
            const terms: z.infer<typeof LoanTermsSchema> = {};
            
            const termsObj = getValue(loan, ['TERMS_OF_MORTGAGE']);
            if (termsObj) {
                const purpose = getDirectValue(termsObj, 'LoanPurposeType');
                if (purpose) {
                    terms.purpose = purpose;
                    
                    if (purpose === 'Refinance') {
                        const refiDetail = getValue(loan, ['REFINANCE']);
                        const refinanceType = getDirectValue(refiDetail, 'RefinanceCashOutDeterminationType');
                        if (refinanceType) terms.refinanceType = refinanceType;
                    }
                    
                    if (purpose === 'Purchase') {
                        const urlaDetail = getValue(loan, ['FORM_SPECIFIC_CONTENTS', 'FORM_SPECIFIC_CONTENT', 'URLA', 'URLA_DETAIL']);
                        const purchasePrice = getDirectValue(urlaDetail, 'PurchasePriceAmount');
                        if (purchasePrice) terms.purchasePrice = purchasePrice;
                    }
                }
                
                const noteAmount = getDirectValue(termsObj, 'NoteAmount');
                const noteDate = getDirectValue(termsObj, 'NoteDate');
                const noteRatePercent = getDirectValue(termsObj, 'NoteRatePercent');
                const mortgageType = getDirectValue(termsObj, 'MortgageType');
                const lienPriority = getDirectValue(termsObj, 'LienPriorityType');
                
                if (noteAmount) terms.noteAmount = noteAmount;
                if (noteDate) terms.noteDate = noteDate;
                if (noteRatePercent) terms.noteRatePercent = noteRatePercent;
                if (mortgageType) terms.mortgageType = mortgageType;
                if (lienPriority) terms.lienPriority = lienPriority;
            }

            // Amortization
            const amortizationObj = getValue(loan, ['AMORTIZATION', 'AMORTIZATION_RULE']);
            if (amortizationObj) {
                const amortizationType = getDirectValue(amortizationObj, 'LoanAmortizationType');
                const termMonths = getDirectValue(amortizationObj, 'LoanAmortizationPeriodCount');
                
                if (amortizationType) terms.amortizationType = amortizationType;
                if (termMonths) terms.termMonths = termMonths;
                
                // Also set current rate to note rate if not specified elsewhere
                if (terms.noteRatePercent && !terms.currentRatePercent) {
                    terms.currentRatePercent = terms.noteRatePercent;
                }
            }
            
            // Maturity
            const maturityObj = getValue(loan, ['MATURITY', 'MATURITY_RULE']);
            if (maturityObj) {
                const maturityDate = getDirectValue(maturityObj, 'LoanMaturityDate');
                if (maturityDate) terms.maturityDate = maturityDate;
            }
            
            // Payment
            const paymentObj = getValue(loan, ['PAYMENT', 'PAYMENT_RULE']);
            if (paymentObj) {
                const initialPI = getDirectValue(paymentObj, 'InitialPrincipalAndInterestPaymentAmount');
                const paymentFrequency = getDirectValue(paymentObj, 'PaymentFrequencyType');
                const firstPaymentDate = getDirectValue(paymentObj, 'ScheduledFirstPaymentDate');
                
                if (initialPI) terms.initialPrincipalInterestPayment = initialPI;
                if (paymentFrequency) terms.paymentFrequency = paymentFrequency;
                if (firstPaymentDate) terms.firstPaymentDate = firstPaymentDate;
            }
            const paymentSummaryObj = getValue(loan, ['PAYMENT', 'PAYMENT_SUMMARY']);
            if (paymentSummaryObj) {
                terms.lastPaidInstallmentDueDate = getDirectValue(paymentSummaryObj, 'LastPaidInstallmentDueDate');
                terms.currentUPB = getDirectValue(paymentSummaryObj, 'UPBAmount');
            }
            const paymentBreakdown = getValue(loan, ['PAYMENT', 'PAYMENT_COMPONENT_BREAKOUTS', 'PAYMENT_COMPONENT_BREAKOUT']);
            if (paymentBreakdown) {
                // we have initial P&I, also set current to the same if not specified elsewhere
                terms.currentPrincipalInterestPayment = getDirectValue(paymentBreakdown, 'PrincipalAndInterestPaymentAmount', terms.initialPrincipalInterestPayment); 
            }

            loanObject.terms = LoanTermsSchema.parse(terms);
            
            // Extract Loan Detail information
            const loanDetailObj = getValue(loan, ['LOAN_DETAIL']);
            const details: z.infer<typeof LoanDetailsSchema> = {};
            if (loanDetailObj) {
                // Extract boolean fields
                const assumable = getDirectValue(loanDetailObj, 'AssumabilityIndicator');
                const prepaymentPenalty = getDirectValue(loanDetailObj, 'PrepaymentPenaltyIndicator');
                const escrow = getDirectValue(loanDetailObj, 'EscrowIndicator');
                const interestOnly = getDirectValue(loanDetailObj, 'InterestOnlyIndicator');
                const negativeAmortization = getDirectValue(loanDetailObj, 'NegativeAmortizationIndicator');
                const balloon = getDirectValue(loanDetailObj, 'BalloonIndicator');
                const heloc = getDirectValue(loanDetailObj, 'HELOCIndicator');
                const totalMortgagedProperties = getDirectValue(loanDetailObj, 'TotalMortgagedPropertiesCount');
                const initialFixedMonths = getDirectValue(loanDetailObj, 'InitialFixedPeriodEffectiveMonthsCount');
                const applicationReceivedDate = getDirectValue(loanDetailObj, 'ApplicationReceivedDate');
                const borrowerCount = getDirectValue(loanDetailObj, 'BorrowerCount');
                const temporaryBuydown = getDirectValue(loanDetailObj, 'BuydownTemporarySubsidyIndicator');
                const capitalizedLoan = getDirectValue(loanDetailObj, 'CapitalizedLoanIndicator');
                const constructionLoan = getDirectValue(loanDetailObj, 'ConstructionLoanIndicator');
                const convertible = getDirectValue(loanDetailObj, 'ConvertibleIndicator');
                const eNote = getDirectValue(loanDetailObj, 'ENoteIndicator');
                const affordableLoan = getDirectValue(loanDetailObj, 'LoanAffordableIndicator');
                const relocationLoan = getDirectValue(loanDetailObj, 'RelocationLoanIndicator');
                const sharedEquity = getDirectValue(loanDetailObj, 'SharedEquityIndicator');
                const mortgageModification = getDirectValue(loanDetailObj, 'MortgageModificationIndicator');
                const warehouseLender = getDirectValue(loanDetailObj, 'WarehouseLenderIndicator');
                const remoteOnlineNotarization = getDirectValue(loanDetailObj, 'RemoteOnlineNotarizationIndicator');
                
                // Update details with extracted values
                if (assumable !== undefined) details.assumable = assumable;
                if (prepaymentPenalty !== undefined) details.prepaymentPenalty = prepaymentPenalty;
                if (escrow !== undefined) details.escrow = escrow;
                if (interestOnly !== undefined) details.interestOnly = interestOnly;
                if (negativeAmortization !== undefined) details.negativeAmortization = negativeAmortization;
                if (balloon !== undefined) details.balloon = balloon;
                if (heloc !== undefined) details.heloc = heloc;
                if (totalMortgagedProperties) details.totalMortgagedProperties = totalMortgagedProperties;
                if (initialFixedMonths) details.initialFixedMonths = initialFixedMonths;
                if (applicationReceivedDate) details.applicationReceivedDate = applicationReceivedDate;
                if (borrowerCount) details.borrowerCount = borrowerCount;
                if (temporaryBuydown !== undefined) details.temporaryBuydown = temporaryBuydown;
                if (capitalizedLoan !== undefined) details.capitalizedLoan = capitalizedLoan;
                if (constructionLoan !== undefined) details.constructionLoan = constructionLoan;
                if (convertible !== undefined) details.convertible = convertible;
                if (eNote !== undefined) details.eNote = eNote;
                if (affordableLoan !== undefined) details.affordableLoan = affordableLoan;
                if (relocationLoan !== undefined) details.relocationLoan = relocationLoan;
                if (sharedEquity !== undefined) details.sharedEquity = sharedEquity;
                if (mortgageModification !== undefined) details.mortgageModification = mortgageModification;
                if (warehouseLender !== undefined) details.warehouseLender = warehouseLender;
                if (remoteOnlineNotarization !== undefined) details.remoteOnlineNotarization = remoteOnlineNotarization;
            }

            loanObject.details = LoanDetailsSchema.parse(details);
           
            
            // HMDA (From AtClosing)
            const hmda = getValue(loan, ['HMDA_LOAN']);
            if (hmda) {
                loanObject.hmda.rateSpreadPercent = getDirectValue(hmda, 'HMDARateSpreadPercent');
                loanObject.hmda.isHoepaLoan = getDirectValue(hmda, 'HMDA_HOEPALoanStatusIndicator');
            }
            // ARM Data - check both possible locations
            const armObj = getValue(loan, ['ADJUSTABLE_RATE']) || 
                getValue(loan, ['ADJUSTMENT', 'INTEREST_RATE_ADJUSTMENT', 'INTEREST_RATE_LIFETIME_ADJUSTMENT_RULE']);

            // Determine amortization type (fixed vs ARM)
            const amortizationType = getDirectValue(amortizationObj, 'LoanAmortizationType');
            const isFixedRate = !amortizationType || amortizationType === 'Fixed';
            let arm: z.infer<typeof ArmSchema> = {};
            if (armObj && !isFixedRate) {
                // Check for fixed period in loan details and other ARM patterns
                const initialFixedMonths = getValue(loan, ['LOAN_DETAIL', 'InitialFixedPeriodEffectiveMonthsCount']);
                const marginPercent = getDirectValue(armObj, 'MarginRatePercent');
                const index = getDirectValue(armObj, 'IndexType');
                
                if (initialFixedMonths) arm.initialFixedMonths = initialFixedMonths;
                if (marginPercent) arm.marginPercent = marginPercent;
                if (index) arm.index = index;
                
                // Additional ARM fields if available
                const lifetimeCapPercent = getDirectValue(armObj, 'CeilingRatePercent');
                const lifetimeFloorPercent = getDirectValue(armObj, 'FloorRatePercent');
                const indexLookbackDays = getDirectValue(armObj, 'IndexLookbackDaysCount');
                const disclosedIndexRatePercent = getDirectValue(armObj, 'DisclosedIndexRatePercent');
                
                if (lifetimeCapPercent) arm.lifetimeCapPercent = lifetimeCapPercent;
                if (lifetimeFloorPercent) arm.lifetimeFloorPercent = lifetimeFloorPercent;
                if (indexLookbackDays) arm.indexLookbackDays = indexLookbackDays;
                if (disclosedIndexRatePercent) arm.disclosedIndexRatePercent = disclosedIndexRatePercent;
                
                // First payment and next adjustment dates
                const firstRateChangePaymentEffectiveDate = getDirectValue(armObj, 'FirstRateChangePaymentEffectiveDate');
                const nextRateAdjustmentEffectiveDate = getDirectValue(armObj, 'NextRateAdjustmentEffectiveDate');
                
                if (firstRateChangePaymentEffectiveDate) {
                    arm.firstRateChangePaymentEffectiveDate = firstRateChangePaymentEffectiveDate;
                }
                
                if (nextRateAdjustmentEffectiveDate) {
                    arm.nextRateAdjustmentEffectiveDate = nextRateAdjustmentEffectiveDate;
                }
                
                // Rounding rules
                const roundingRuleObj = getValue(armObj, ['ROUNDING_RULE']);
                if (roundingRuleObj) {
                    const roundingType = getDirectValue(roundingRuleObj, 'RoundingType');
                    const roundingPercent = getDirectValue(roundingRuleObj, 'RoundingPercent');
                    
                    arm.roundingRule = {
                        type: roundingType || '',
                        percent: roundingPercent || ''
                    };
                }
                
                // Periodic caps
                const periodicCapsObj = getValue(armObj, ['PERIODIC_RATE_CAP']);
                
                if (periodicCapsObj) {
                    const periodicCaps: Array<{
                        type: string;
                        maxIncreasePercent: string;
                        maxDecreasePercent: string;
                        frequencyMonths: string;
                        firstEffectiveDateForRuleType: string;
                    }> = [];
                    
                    const capsArray = Array.isArray(periodicCapsObj) ? periodicCapsObj : [periodicCapsObj];
                    
                    capsArray.forEach(cap => {
                            periodicCaps.push({
                            type: getDirectValue(cap, 'PeriodicRateCapRuleType') || '',
                            maxIncreasePercent: getDirectValue(cap, 'PeriodicRateCapMaximumUpPercent') || '',
                            maxDecreasePercent: getDirectValue(cap, 'PeriodicRateCapMaximumDownPercent') || '',
                            frequencyMonths: getDirectValue(cap, 'PeriodicRateCapFrequencyMonthsCount') || '',
                            firstEffectiveDateForRuleType: getDirectValue(cap, 'FirstPeriodicRateCapEffectiveDateForRuleType') || ''
                        });
                    });
                    
                    arm.periodicCaps = periodicCaps;
                }
            } else {
                // Fixed rate loan - explicitly set ARM to null
                arm = {};
            }
            loanObject.arm = ArmSchema.parse(arm);
            
            // Process qualification
            const qualification: z.infer<typeof QualificationSchema> = {};
            const qualObj = getValue(loan, ['QUALIFICATION']);
            if (qualObj) {
                const totalMonthlyIncome = getDirectValue(qualObj, 'TotalMonthlyIncomeAmount');
                const totalMonthlyLiabilities = getDirectValue(qualObj, 'TotalLiabilitiesMonthlyPaymentAmount');
                const totalProposedHousingExpense = getDirectValue(qualObj, 'TotalMonthlyProposedHousingExpenseAmount');
                const totalMonthlyDebt = getDirectValue(qualObj, 'TotalMonthlyDebtAmount') || 
                    (totalMonthlyLiabilities && totalProposedHousingExpense ? 
                        (Number(totalMonthlyLiabilities) + Number(totalProposedHousingExpense)).toString() : '');
                const borrowerReservesMonths = getDirectValue(qualObj, 'BorrowerReservesMonthlyPaymentCount');
                
                if (totalMonthlyIncome) qualification.totalMonthlyIncome = totalMonthlyIncome;
                if (totalMonthlyLiabilities) qualification.totalMonthlyLiabilities = totalMonthlyLiabilities;
                if (totalProposedHousingExpense) qualification.totalProposedHousingExpense = totalProposedHousingExpense;
                if (totalMonthlyDebt) qualification.totalMonthlyDebt = totalMonthlyDebt;
                if (borrowerReservesMonths) qualification.borrowerReservesMonths = borrowerReservesMonths;
                
                // Calculate housing and DTI ratios
                if (totalMonthlyIncome && totalProposedHousingExpense) {
                    const income = Number(totalMonthlyIncome);
                    const housingExpense = Number(totalProposedHousingExpense);
                    
                    if (income > 0) {
                        qualification.housingRatioPercent = parseFloat(((housingExpense / income) * 100).toFixed(2));
                    }
                    
                    // Try multiple approaches to calculate DTI
                    if (income > 0) {
                        if (totalMonthlyDebt) {
                            // Direct calculation if total monthly debt is available
                            qualification.totalDtiPercent = parseFloat((Number(totalMonthlyDebt) / income * 100).toFixed(2));
                        } else if (totalMonthlyLiabilities) {
                            // Calculate using total liabilities plus housing expense
                            const debt = Number(totalMonthlyLiabilities) + housingExpense;
                            qualification.totalDtiPercent = parseFloat((debt / income * 100).toFixed(2));
                        }
                    }
                }
            }
            loanObject.qualification = QualificationSchema.parse(qualification);
            
            // Process underwriting
            const underwriting: z.infer<typeof UnderwritingSchema> = {};
            
            // AUS results
            const selectedProduct = getValue(loan, ['SELECTED_LOAN_PRODUCT']);
            if (selectedProduct) {
                // Price lock date
                const priceLock = getValue(selectedProduct, ['PRICE_LOCKS', 'PRICE_LOCK']);
                if (priceLock) {
                    const priceLockDateTime = getDirectValue(priceLock, 'PriceLockDatetime');
                    if (priceLockDateTime) underwriting.priceLockDateTime = priceLockDateTime;
                }
            }
            
            // Loan level credit
            const loanLevelCredit = getValue(loan, ['LOAN_LEVEL_CREDIT', 'LOAN_LEVEL_CREDIT_DETAIL']);
            if (loanLevelCredit) {
                const loanLevelCreditScore = getDirectValue(loanLevelCredit, 'LoanLevelCreditScoreValue');
                const scoreSelectionMethod = getDirectValue(loanLevelCredit, 'LoanLevelCreditScoreSelectionMethodType');
                
                if (loanLevelCreditScore) underwriting.loanLevelCreditScore = loanLevelCreditScore;
                if (scoreSelectionMethod) underwriting.scoreSelectionMethod = scoreSelectionMethod;
            }
            loanObject.underwriting = UnderwritingSchema.parse(underwriting);
            
            // Extract LTV ratio values
            const ltvObj = getValue(loan, ['LTV']);
            const ltv: z.infer<typeof LtvSchema> = {};
            if (ltvObj) {
                const ltvRatio = getDirectValue(ltvObj, 'LTVRatioPercent');
                const baseLtvRatio = getDirectValue(ltvObj, 'BaseLTVRatioPercent');
                
                if (ltvRatio) ltv.ltvRatioPercent = ltvRatio;
                if (baseLtvRatio) ltv.baseLtvRatioPercent = baseLtvRatio;
            }
            
            // Add CLTV from combined LTV
            const combinedLtvs = getValue(deal, ['LOANS', 'COMBINED_LTVS', 'COMBINED_LTV']);
            
            if (combinedLtvs) {
                const cltvRatio = getDirectValue(combinedLtvs, 'CombinedLTVRatioPercent');
                if (cltvRatio) ltv.cltvRatioPercent = cltvRatio;
            }
            loanObject.ltv = LtvSchema.parse(ltv);
            
            // Extract interest calculation
            const calculation: z.infer<typeof CalculationSchema> = {};
            const interestCalculation = getValue(loan, ['INTEREST_CALCULATION', 'INTEREST_CALCULATION_RULES', 'INTEREST_CALCULATION_RULE']);
            if (interestCalculation) {
                const calcType = getDirectValue(interestCalculation, 'InterestCalculationType');
                const calcPeriod = getDirectValue(interestCalculation, 'InterestCalculationPeriodType');
                
                if (calcType) calculation.type = calcType;
                if (calcPeriod) calculation.period = calcPeriod;
            }
            loanObject.calculation = CalculationSchema.parse(calculation);
            
            // Extract buydown information
            const buydown = getValue(loan, ['BUYDOWN']);
            const buydownObject: z.infer<typeof BuydownSchema> = {};
            if (buydown) {
                const buydownRules = getValue(buydown, ['BUYDOWN_RULE']);
                if (buydownRules) {
                    // Extract buydown terms
                    const durationMonths = getDirectValue(buydownRules, 'BuydownDurationMonthsCount');
                    const initialDiscountPercent = getDirectValue(buydownRules, 'BuydownInitialDiscountPercent');
                    const changeFrequencyMonths = getDirectValue(buydownRules, 'BuydownChangeFrequencyMonthsCount');
                    const increaseRatePercent = getDirectValue(buydownRules, 'BuydownIncreaseRatePercent');
                    
                    if (durationMonths) buydownObject.durationMonths = durationMonths;
                    if (initialDiscountPercent) buydownObject.initialDiscountPercent = initialDiscountPercent;
                    if (changeFrequencyMonths) buydownObject.changeFrequencyMonths = changeFrequencyMonths;
                    if (increaseRatePercent) buydownObject.increaseRatePercent = increaseRatePercent;
                }
                
                // Extract contributor info
                const contributors = getValue(buydown, ['BUYDOWN_CONTRIBUTORS', 'BUYDOWN_CONTRIBUTOR']);
                if (contributors) {
                    const contributorArray = Array.isArray(contributors) ? contributors : [contributors];
                    const contributorTypes: string[] = [];
                    
                    contributorArray.forEach(contributor => {
                        const detail = getValue(contributor, ['BUYDOWN_CONTRIBUTOR_DETAIL']);
                        const type = getDirectValue(detail, 'BuydownContributorType');
                        if (type) contributorTypes.push(type);
                    });
                    
                    if (contributorTypes.length > 0) {
                        buydownObject.contributors = contributorTypes;
                    }
                }
                
                // Extract collected funds amount
                const closingInfo = getValue(loan, ['CLOSING_INFORMATION', 'COLLECTED_OTHER_FUNDS', 'COLLECTED_OTHER_FUND']);
                if (closingInfo) {
                    const closingInfoArray = Array.isArray(closingInfo) ? closingInfo : [closingInfo];
                    
                    for (const fund of closingInfoArray) {
                        const type = getDirectValue(fund, 'OtherFundsCollectedAtClosingType');
                        const desc = getDirectValue(fund, 'OtherFundsCollectedAtClosingTypeOtherDescription');
                        const amount = getDirectValue(fund, 'OtherFundsCollectedAtClosingAmount');
                        
                        if (type === 'Other' && desc === 'Buydown' && amount) {
                            buydownObject.fundsCollectedAmount = amount;
                            break;
                        }
                    }
                }
            }
            loanObject.buydown = BuydownSchema.parse(buydownObject);
            
            // Extract MI information
            const mi: z.infer<typeof MiSchema> = {};
            const miData = getValue(loan, ['MI_DATA']);
            if (miData) {
                
                const miDetail = getValue(miData, ['MI_DATA_DETAIL']);
                
                if (miDetail) {
                    const miCompany = getDirectValue(miDetail, 'MICertificateCompanyName');
                    const miCertId = getDirectValue(miDetail, 'MICertificateIdentifier');
                    const miCoveragePercent = getDirectValue(miDetail, 'MICoveragePercent');
                    const miPremiumSource = getDirectValue(miDetail, 'MIPremiumSourceType');
                    const miFinanced = getDirectValue(miDetail, 'MIPremiumFinancedIndicator');
                    const miPlanType = getDirectValue(miDetail, 'MIPremiumPlanType');
                    const miRateAdjPercent = getDirectValue(miDetail, 'MIRateAdjustmentPercent');
                    const miAbsenceReason = getDirectValue(miDetail, 'PrimaryMIAbsenceReasonType');
                    mi.isAbsent = false;  // If we found MI data, it's present
                    
                    if (miCompany) mi.company = miCompany;
                    if (miCertId) mi.certificateId = miCertId;
                    if (miCoveragePercent) mi.coveragePercent = miCoveragePercent;
                    if (miPremiumSource) mi.premiumSource = miPremiumSource;
                    if (miFinanced !== undefined) mi.isPremiumFinanced = miFinanced;
                    if (miPlanType) mi.premiumPlanType = miPlanType;
                    if (miRateAdjPercent) mi.rateAdjustmentPercent = miRateAdjPercent;
                    if (miAbsenceReason) mi.absenceReason = miAbsenceReason;

                    const miDetailExt = getValue(miDetail, ['EXTENSION', 'OTHER', 'MI_DATA_DETAIL_EXTENSION']);
                    if (miDetailExt) {
                        const miPlanType = getDirectValue(miDetailExt, 'MIPremiumPlanType');
                        const miRateAdjPercent = getDirectValue(miDetailExt, 'MIInterestRateAdjustmentPercent');
                        if (miPlanType) mi.premiumPlanType = miPlanType;
                        if (miRateAdjPercent) mi.rateAdjustmentPercent = miRateAdjPercent;
                    }
                }
                
                // Try alternate locations if no MI certificate found
                if (!mi.certificateId) {
                    // Sometimes MI certificate is in an extension element
                    const miExtension = getValue(miDetail, ['EXTENSION', 'OTHER', 'MI_EXTENSION']);
                    const altCertId = getDirectValue(miExtension, 'MICertificateIdentifier');
                    
                    if (altCertId) {
                        mi.certificateId = altCertId;
                    }
                }
            } else {
                // MI might be referenced in loan detail
                const loanDetailMI = getDirectValue(loan, 'MICaseIdentifier');
                if (loanDetailMI) {
                    mi.certificateId = loanDetailMI;
                    mi.isAbsent = false;
                }
            }
            loanObject.mi = MiSchema.parse(mi);
            
            // TODO: Check LTV to see if MI is likely required
            // Check LTV to see if MI is likely required
            // if (!miObj && loanDetailObj && !rawData.loan.mi.certificateId) {
            //     const miRequired = getDirectValue(loanDetailObj, 'MICompanyRequiredIndicator');
            //     if (miRequired && safeBoolean(miRequired)) {
            //         // MI is likely required based on LTV but data missing
            //         rawData.loan.mi.isAbsent = false;  // Not truly absent, just missing data
            //     } else if (rawData.loan.ltv.ltvRatioPercent > 80) {
            //         // If LTV > 80% and no MI, mark as potentially missing
            //         rawData.loan.mi.isAbsent = false;
            //     }
            // }
            
            // Extract escrow information if present in loan
            const escrow: z.infer<typeof EscrowSchema> = { items: [] };
            const escrowObj = getValue(loan, ['ESCROW']);
            if (escrowObj) {
                // Get escrow balance
                const escrowDetail = getValue(escrowObj, ['ESCROW_DETAIL']);
                if (escrowDetail) {
                    const balance = getDirectValue(escrowDetail, 'EscrowBalanceAmount');
                    if (balance) escrow.currentBalance = balance;
                }
                
                // Get escrow items
                const escrowItems = getValue(escrowObj, ['ESCROW_ITEMS', 'ESCROW_ITEM']);
                if (escrowItems) {
                    const itemArray = Array.isArray(escrowItems) ? escrowItems : [escrowItems];
                    const items: z.infer<typeof EscrowItemSchema>[] = [];
                    itemArray.forEach(item => {
                        const itemDetail = getValue(item, ['ESCROW_ITEM_DETAIL']);
                        if (itemDetail) {
                            const type = getDirectValue(itemDetail, 'EscrowItemType');
                            const amount = getDirectValue(itemDetail, 'EscrowMonthlyPaymentAmount');
                            
                            if (type && amount) {
                                items.push({
                                    type,
                                    monthlyAmount: amount
                                });
                            }
                        }
                    });
                    if (items.length > 0) {
                        escrow.items = items;
                    }
                }
                loanObject.escrow = EscrowSchema.parse(escrow);
            }
            
            // AUS results from UNDERWRITING_VERIFICATION
            const currentDate = getDirectValue(getValue(loan, ['LOAN_STATE']), 'LoanStateDate');
            const deliveryServicing: z.infer<typeof DeliveryServicingSchema> = {};
            if (currentDate) {
                deliveryServicing.loanStateCurrentDate = currentDate;
            }

            const investorInfo = getValue(loan, ['INVESTOR_LOAN_INFORMATION']);
            if (investorInfo) {
                deliveryServicing.investorOwnershipPercent = getDirectValue(investorInfo, 'InvestorOwnershipPercent');
                deliveryServicing.investorRemittanceType = getDirectValue(investorInfo, 'InvestorRemittanceType');
                deliveryServicing.investorProductPlanId = getDirectValue(investorInfo, 'InvestorProductPlanIdentifier');
            }

            const investorFeatures = getValue(loan, ['INVESTOR_FEATURES', 'INVESTOR_FEATURE']);
            if (investorFeatures && investorFeatures !== 'N/A') {
                const featuresArray = Array.isArray(investorFeatures) ? investorFeatures : [investorFeatures];
                deliveryServicing.investorFeatureCodes = featuresArray.map(f => getDirectValue(f, 'InvestorFeatureIdentifier'));
            }

            const mersReg = getValue(loan, ['MERS_REGISTRATIONS', 'MERS_REGISTRATION']);
            deliveryServicing.mersRegistrationStatus = getDirectValue(mersReg, 'MERSRegistrationStatusType');

            const servicing = getValue(loan, ['SERVICING']);
            const delinquency = getValue(servicing, ['DELINQUENCY_SUMMARY']);
            deliveryServicing.delinquentPaymentsLast12Months = getDirectValue(delinquency, 'DelinquentPaymentsOverPastTwelveMonthsCount');
            const disclosure = getValue(servicing, ['DISCLOSURE_ON_SERVICER']);
            deliveryServicing.servicingTransferEffectiveDate = getDirectValue(disclosure, 'ServicingTransferEffectiveDate');

            // Loan States (Get dates from the specific containers)
            deliveryServicing.loanStateAtClosingDate = getValue(loan, ['LOAN_STATE', 'LoanStateDate']);
            deliveryServicing.loanStateCurrentDate = getValue(loan, ['LOAN_STATE', 'LoanStateDate']);
            
            loanObject.deliveryServicing = DeliveryServicingSchema.parse(deliveryServicing);
            
            const loanIdentifiers = getValue(loan, ['LOAN_IDENTIFIERS', 'LOAN_IDENTIFIER']);
            const partiesAndIds: z.infer<typeof PartiesAndIdsSchema> = {};
            if (loanIdentifiers && loanIdentifiers !== 'N/A') {
                const idArray = Array.isArray(loanIdentifiers) ? loanIdentifiers : [loanIdentifiers];
                idArray.forEach(id => {
                    if (getDirectValue(id, 'SellerLoanIdentifier', null)) partiesAndIds.sellerLoanId = getDirectValue(id, 'SellerLoanIdentifier');
                    if (getDirectValue(id, 'ServicerLoanIdentifier', null)) partiesAndIds.servicerLoanId = getDirectValue(id, 'ServicerLoanIdentifier');
                    if (getDirectValue(id, 'MERS_MINIdentifier', null)) partiesAndIds.mersMin = getDirectValue(id, 'MERS_MINIdentifier');
                    if (getDirectValue(id, 'InvestorCommitmentIdentifier', null)) partiesAndIds.investorCommitmentId = getDirectValue(id, 'InvestorCommitmentIdentifier');
                });
                loanObject.partiesAndIds = PartiesAndIdsSchema.parse(partiesAndIds);
            }
            if (loanObject.partiesAndIds?.sellerLoanId) {
                rawData.loanIdentifier = loanObject.partiesAndIds.sellerLoanId;
                loanObject.partiesAndIds.originator = { type: 'Seller', id: loanObject.partiesAndIds.sellerLoanId };
            }
            if (loanObject) loanInApplications.push(LoanSchema.parse(loanObject));
        }
    });


    if (!loanInApplications || loanInApplications.length === 0) {
        throw new Error("Could not find necessary SubjectLoan containers (AtClosing or Current).");
    }

    // Property
    const property = getValue(deal, ['COLLATERALS', 'COLLATERAL', 'PROPERTIES', 'PROPERTY']);
    if (property) {
        const address: z.infer<typeof AddressSchema> = {};
        const details: z.infer<typeof PropertyDetailsSchema> = {};
        const project: z.infer<typeof ProjectSchema> = {};
        const appraisal: z.infer<typeof AppraisalSchema> = {};
        
        // Address
        const addressObj = getValue(property, ['ADDRESS']);
        if (addressObj) {
            const line1 = getDirectValue(addressObj, 'AddressLineText');
            const unit = getDirectValue(addressObj, 'AddressUnitIdentifier');
            const city = getDirectValue(addressObj, 'CityName');
            const state = getDirectValue(addressObj, 'StateCode');
            const zip = getDirectValue(addressObj, 'PostalCode');
            
            if (line1) address.line1 = line1;
            if (unit) address.unit = unit;
            if (city) address.city = city;
            if (state) address.state = state;
            if (zip) address.zip = zip;
        }
        property.address = AddressSchema.parse(address);
        
        // Property Details
        const propDetail = getValue(property, ['PROPERTY_DETAIL']);
        if (propDetail) {
            const type = getDirectValue(propDetail, 'AttachmentType');
            const usage = getDirectValue(propDetail, 'PropertyUsageType');
            const construction = getDirectValue(propDetail, 'ConstructionMethodType');
            const estateType = getDirectValue(propDetail, 'PropertyEstateType');
            const yearBuilt = getDirectValue(propDetail, 'PropertyStructureBuiltYear');
            const financedUnits = getDirectValue(propDetail, 'FinancedUnitCount');
            const attachmentType = getDirectValue(propDetail, 'AttachmentType');
            const floodInsuranceRequired = getDirectValue(propDetail, 'PropertyFloodInsuranceIndicator');
            
            if (type) details.type = type;
            if (usage) details.usage = usage;
            if (construction) details.construction = construction;
            if (estateType) details.estateType = estateType;
            if (yearBuilt) details.yearBuilt = yearBuilt;
            if (financedUnits) details.financedUnits = financedUnits;
            if (attachmentType) details.attachmentType = attachmentType;
            if (floodInsuranceRequired !== undefined) details.floodInsuranceRequiredByLender = floodInsuranceRequired;

            property.details = PropertyDetailsSchema.parse(details);
        }
        
        // Flood Determination
        const floodDet = getValue(property, ['FLOOD_DETERMINATION', 'FLOOD_DETERMINATION_DETAIL']);
        const inSpecialFloodHazardArea = getDirectValue(floodDet, 'SpecialFloodHazardAreaIndicator');
        if (inSpecialFloodHazardArea !== undefined) {
            property.inSpecialFloodHazardArea = inSpecialFloodHazardArea;
            property.inSpecialFloodHazardArea = inSpecialFloodHazardArea;
        }
        
        // Property Valuation
        const valuation = getValue(property, ['PROPERTY_VALUATIONS', 'PROPERTY_VALUATION', 'PROPERTY_VALUATION_DETAIL']);
        if (valuation) {
            const method = getDirectValue(valuation, 'PropertyValuationMethodType');
            const form = getDirectValue(valuation, 'PropertyValuationFormType');
            const value = getDirectValue(valuation, 'PropertyValuationAmount');
            const effectiveDate = getDirectValue(valuation, 'PropertyValuationEffectiveDate');
            const id = getDirectValue(valuation, 'AppraisalIdentifier');
            
            if (method) appraisal.method = method;
            if (form) appraisal.form = form;
            if (value) appraisal.value = value;
            if (effectiveDate) appraisal.effectiveDate = effectiveDate;
            if (id) appraisal.id = id;
            property.appraisal = AppraisalSchema.parse(appraisal);
        }
        // Project Information
        const projectObj = getValue(property, ['PROJECT', 'PROJECT_DETAIL']);
        if (projectObj) {
            const projExt = getValue(projectObj, ['EXTENSION', 'OTHER', 'PROJECT_DETAIL_EXTENSION']);
            
            const name = getDirectValue(projectObj, 'ProjectName');
            const legalStructure = getDirectValue(projectObj, 'ProjectLegalStructureType');
            const classificationId = getDirectValue(projectObj, 'ProjectClassificationIdentifier');
            
            const isPud = getDirectValue(projectObj, 'PUDIndicator');
            const fnmaCpmProjectId = getDirectValue(projectObj, 'FNMCondominiumProjectManagerProjectIdentifier');
            const fnmaCpmCertId = getDirectValue(projExt, 'FNMCondominiumProjectManagerCertificationIdentifier');
            
            if (name) project.name = name;
            if (legalStructure) project.legalStructure = legalStructure;
            if (classificationId) project.classificationId = classificationId;
            if (isPud !== undefined) project.isPud = isPud;
            if (fnmaCpmProjectId) project.fnmaCpmProjectId = fnmaCpmProjectId;
            if (fnmaCpmCertId) project.fnmaCpmCertId = fnmaCpmCertId;
        }
        property.project = ProjectSchema.parse(project);
        // Deed Restriction
        const propExt = getValue(property, ['EXTENSION', 'OTHER', 'PROPERTY_EXTENSION', 'DEED_RESTRICTION']);
        const deedRestrictionTermMonths = getDirectValue(propExt, 'DeedRestrictionTermMonthsCount');
        if (deedRestrictionTermMonths) {
            property.deedRestrictionTermMonths = deedRestrictionTermMonths;
            property.deedRestrictionTermMonths = deedRestrictionTermMonths;
        }
    }
    rawData.property = PropertySchema.parse(property);

    // Extract borrowers data
    const partyArray = Array.isArray(parties) ? parties : [parties];
    const borrowers: z.infer<typeof BorrowerSchema>[] = [];

    partyArray.forEach(party => {
        const roles = getValue(party, ['ROLES', 'ROLE']);
        const rolesArray = Array.isArray(roles) ? roles : [roles];
        
        rolesArray.forEach(role => {
            const roleType = getValue(role, ['ROLE_DETAIL', 'PartyRoleType']);
            
            if (roleType === 'Borrower') {
                const borrowerDetail = getValue(role, ['BORROWER', 'BORROWER_DETAIL']);
                const individual = getValue(party, ['INDIVIDUAL']);
                const address = getValue(party, ['ADDRESSES', 'ADDRESS']);
                const declaration = getValue(role, ['BORROWER', 'DECLARATION', 'DECLARATION_DETAIL']);
                const creditScores = getValue(role, ['BORROWER', 'CREDIT_SCORES', 'CREDIT_SCORE']);
                const employment = getValue(role, ['BORROWER', 'EMPLOYERS', 'EMPLOYER', 'EMPLOYMENT']);
                const govMonitoring = getValue(role, ['BORROWER', 'GOVERNMENT_MONITORING', 'GOVERNMENT_MONITORING_DETAIL']);
                
                // Create borrower object
                const borrower: z.infer<typeof BorrowerSchema> = {
                    name: {},
                    classification: getDirectValue(borrowerDetail, 'BorrowerClassificationType'),
                    dob: getDirectValue(borrowerDetail, 'BorrowerBirthDate'),
                    qualifyingIncome: getDirectValue(borrowerDetail, 'BorrowerQualifyingIncomeAmount'),
                    ageAtApplication: getDirectValue(borrowerDetail, 'BorrowerAgeAtApplicationYearsCount'),
                    mailToAddressSameAsProperty: getDirectValue(borrowerDetail, 'BorrowerMailToAddressSameAsPropertyIndicator'),
                    declarations: {
                        intentToOccupy: getDirectValue(declaration, 'IntentToOccupyType'),
                        citizenship: getDirectValue(declaration, 'CitizenshipResidencyType'),
                        bankruptcy: getDirectValue(declaration, 'BankruptcyIndicator'),
                        foreclosure: getDirectValue(declaration, 'ForeclosureIndicator'),
                        firstTimeHomebuyer: getDirectValue(declaration, 'BorrowerFirstTimeHomebuyerIndicator')
                    },
                    isSelfEmployed: getDirectValue(employment, 'EmploymentBorrowerSelfEmployedIndicator')
                };
                // Extract borrower name from NAME element
                if (individual && individual.NAME) {
                    const nameElement = individual.NAME;
                    if (nameElement.FirstName && borrower.name) borrower.name.first = nameElement.FirstName;
                    if (nameElement.MiddleName && borrower.name) borrower.name.middle = nameElement.MiddleName;
                    if (nameElement.LastName && borrower.name) borrower.name.last = nameElement.LastName;
                    if (nameElement.SuffixName && borrower.name) borrower.name.suffix = nameElement.SuffixName;
                }
                
                // Add mailing address if present
                if (address && getDirectValue(address, 'AddressType') === 'Mailing') {
                    borrower.mailingAddress = {
                        line1: getDirectValue(address, 'AddressLineText'),
                        unit: getDirectValue(address, 'AddressUnitIdentifier'),
                        city: getDirectValue(address, 'CityName'),
                        state: getDirectValue(address, 'StateCode'),
                        zip: getDirectValue(address, 'PostalCode'),
                        country: getDirectValue(address, 'CountryCode')
                    };
                }
                
                // Add credit scores if present
                if (creditScores) {
                    const scoreArray = Array.isArray(creditScores) ? creditScores : [creditScores];
                    borrower.creditScores = scoreArray.map(score => {
                        const scoreDetail = getValue(score, ['CREDIT_SCORE_DETAIL']);
                        return {
                            repository: scoreDetail ? getDirectValue(scoreDetail, 'CreditRepositorySourceType') || '' : '',
                            score: scoreDetail ? getDirectValue(scoreDetail, 'CreditScoreValue') || '' : '',
                            reportId: scoreDetail ? getDirectValue(scoreDetail, 'CreditReportIdentifier') || '' : ''
                        };
                    });
                }
                
                // Extract borrower's SSN last 4 digits
                const taxpayerIdentifiers = getValue(party, ['TAXPAYER_IDENTIFIERS', 'TAXPAYER_IDENTIFIER']);
                if (taxpayerIdentifiers) {
                    const taxIdArray = Array.isArray(taxpayerIdentifiers) ? taxpayerIdentifiers : [taxpayerIdentifiers];
                    
                    for (const taxId of taxIdArray) {
                        const taxIdType = getDirectValue(taxId, 'TaxpayerIdentifierType');
                        const taxIdValue = getDirectValue(taxId, 'TaxpayerIdentifierValue');
                        
                        if (taxIdType === 'SocialSecurityNumber' && taxIdValue) {
                            borrower.ssnLast4 = taxIdValue.slice(-4);
                            break;
                        }
                    }
                }
                
                // Add HMDA demographics if present
                if (govMonitoring) {
                    const govExt = getValue(govMonitoring, ['EXTENSION', 'OTHER', 'GOVERNMENT_MONITORING_DETAIL_EXTENSION']);
                    
                    borrower.hmdaDemographics = {
                        ethnicityCollectedByObservation: getDirectValue(govExt, 'HMDAEthnicityCollectedBasedOnVisualObservationOrSurnameIndicator'),
                        ethnicityRefused: getDirectValue(govExt, 'HMDAEthnicityRefusalIndicator'),
                        raceCollectedByObservation: getDirectValue(govExt, 'HMDARaceCollectedBasedOnVisualObservationOrSurnameIndicator'),
                        raceRefused: getDirectValue(govExt, 'HMDARaceRefusalIndicator'),
                        gender: {
                            type: getDirectValue(govExt, 'HMDAGenderType') || '',
                            collectedByObservation: getDirectValue(govExt, 'HMDAGenderCollectedBasedOnVisualObservationOrNameIndicator'),
                            refused: getDirectValue(govExt, 'HMDAGenderRefusalIndicator')
                        }
                    };
                    
                    // Process ethnicity and race from their respective extensions
                    const ethnicityExt = getValue(party, ['ROLES', 'ROLE', 'BORROWER', 'GOVERNMENT_MONITORING', 
                        'EXTENSION', 'OTHER', 'GOVERNMENT_MONITORING_EXTENSION', 'HMDA_ETHNICITIES', 'HMDA_ETHNICITY']);
                    
                    if (ethnicityExt) {
                        const ethnicityArray = Array.isArray(ethnicityExt) ? ethnicityExt : [ethnicityExt];
                        borrower.hmdaDemographics.ethnicity = ethnicityArray.map(eth => ({
                            type: getDirectValue(eth, 'HMDAEthnicityType') || ''
                        }));
                    }
                    
                    // Extract ethnicity origins
                    const ethnicityOrigins = getValue(party, ['ROLES', 'ROLE', 'BORROWER', 'GOVERNMENT_MONITORING', 
                        'EXTENSION', 'OTHER', 'GOVERNMENT_MONITORING_EXTENSION', 'HMDA_ETHNICITY_ORIGINS', 'HMDA_ETHNICITY_ORIGIN']);
                    
                    if (ethnicityOrigins) {
                        const originsArray = Array.isArray(ethnicityOrigins) ? ethnicityOrigins : [ethnicityOrigins];
                        const originValues: string[] = [];
                        
                        originsArray.forEach(origin => {
                            const originType = getDirectValue(origin, 'HMDAEthnicityOriginType');
                            
                            if (originType === 'Other') {
                                const otherDescription = getDirectValue(origin, 'HMDAEthnicityOriginTypeOtherDescription');
                                if (otherDescription) originValues.push(otherDescription);
                            } else if (originType) {
                                originValues.push(originType);
                            }
                        });
                        
                        if (originValues.length > 0) {
                            borrower.hmdaDemographics.ethnicityOrigins = originValues;
                        }
                    }
                    
                    const raceExt = getValue(party, ['ROLES', 'ROLE', 'BORROWER', 'GOVERNMENT_MONITORING', 
                        'HMDA_RACES', 'HMDA_RACE', 'EXTENSION', 'OTHER', 'HMDA_RACE_EXTENSION', 'HMDA_RACE_DETAIL']);
                    
                    if (raceExt) {
                        const raceArray = Array.isArray(raceExt) ? raceExt : [raceExt];
                        borrower.hmdaDemographics.race = raceArray.map(race => ({
                            type: getDirectValue(race, 'HMDARaceType'),
                            otherDescription: getDirectValue(race, 'HMDARaceTypeOtherDescription')
                        }));
                    }
                }
                
                borrowers.push(BorrowerSchema.parse(borrower));
            }
        });
    });

    if (borrowers.length > 0) {
        rawData.borrowers = borrowers;
    }

    rawData.loans = loanInApplications;
    
    const parsed = LoanApplicationSchema.parse(rawData);
    return parsed;
} 