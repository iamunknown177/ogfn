import { Router } from "express";
import type { Profile, Loadout } from "@ogfn/shared";
import { generateId } from "@ogfn/shared";

const profiles = new Map<string, Profile>();

function getOrCreateProfile(accountId: string): Profile {
  if (profiles.has(accountId)) {
    return profiles.get(accountId)!;
  }

  const defaultLoadout: Loadout = {
    id: generateId(),
    name: "Default",
    character: "CID_001_Athena_Commando_M_Default",
    backBlings: [],
    pickaxe: "Pickaxe_ID_001_Default",
    glider: "Glider_ID_001_Default",
    emotes: ["EID_DanceMoves"],
  };

  const profile: Profile = {
    accountId,
    displayName: "Player_" + accountId.slice(0, 6),
    level: 1,
    xp: 0,
    battlePass: { season: 24, tier: 1, xp: 0, purchased: false },
    inventory: {
      items: [],
      currencies: [
        { name: "MtxCurrency", amount: 10000 },
        { name: "Currency_Gold", amount: 0 },
      ],
    },
    loadouts: [defaultLoadout],
    stats: {
      wins: 0,
      kills: 0,
      matchesPlayed: 0,
      topTen: 0,
      topTwentyFive: 0,
      minutesPlayed: 0,
    },
  };

  profiles.set(accountId, profile);
  return profile;
}

export const profileRouter = Router();

profileRouter.post("/:accountId/client/QueryProfile", (req, res) => {
  const profile = getOrCreateProfile(req.params.accountId);
  res.json({ profile });
});

profileRouter.post(
  "/:accountId/client/EquipBattleRoyaleCustomization",
  (req, res) => {
    const profile = getOrCreateProfile(req.params.accountId);
    const { slot, itemTemplateId } = req.body;

    const loadout = profile.loadouts[0];
    if (loadout) {
      switch (slot) {
        case "character":
          loadout.character = itemTemplateId;
          break;
        case "backBling":
          loadout.backBlings = [itemTemplateId];
          break;
        case "pickaxe":
          loadout.pickaxe = itemTemplateId;
          break;
        case "glider":
          loadout.glider = itemTemplateId;
          break;
        case "emote":
          loadout.emotes = [itemTemplateId];
          break;
      }
    }

    res.json({ status: "success", profile });
  }
);

profileRouter.post(
  "/:accountId/client/PurchaseCatalogEntry",
  (req, res) => {
    const profile = getOrCreateProfile(req.params.accountId);
    const { offerId } = req.body;

    res.json({
      status: "success",
      profile,
      purchase: { offerId, purchasedAt: Date.now() },
    });
  }
);

profileRouter.post("/:accountId/client/MarkItemSeen", (req, res) => {
  const profile = getOrCreateProfile(req.params.accountId);
  res.json({ status: "success", profile });
});
