/**
 * Utility functions for subscription management
 */

/**
 * Returns the features available for a specific subscription tier
 */
export const getFeaturesByTier = (tier: string): string[] => {
  switch (tier) {
    case 'enterprise':
      return [
        'lawSections',
        'caseHistories',
        'aiAnalysis',
        'caseDrafting',
        'prioritySupport',
        'customIntegrations',
        'advancedExport',
        'bulkProcessing'
      ];
    case 'pro':
      return [
        'lawSections',
        'caseHistories',
        'aiAnalysis',
        'advancedExport'
      ];
    case 'free':
    default:
      return [
        'lawSections',
        'caseHistories'
      ];
  }
};
