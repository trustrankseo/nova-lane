/**
 * Safe development adapter. Replace these methods with Google AdMob and Play
 * Billing calls after configuring real store IDs; the game UI needs no changes.
 */
export const monetization = {
  async showRewardedAd(): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 900));
    return true;
  },
  async buy(productId: string): Promise<{ ok: boolean; productId: string }> {
    await new Promise((resolve) => setTimeout(resolve, 650));
    return { ok: true, productId };
  }
};
