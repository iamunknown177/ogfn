import { Router } from "express";
import { catalogItems } from "../../data/catalog";

export const catalogRouter = Router();

catalogRouter.get("/:catalogName", (req, res) => {
  const catalogName = req.params.catalogName;

  res.json({
    name: catalogName,
    entries: catalogItems.map((item) => ({
      offerId: item.templateId,
      devName: item.name,
      description: item.description,
      price: {
        currencyType: "MtxCurrency",
        currencySubType: "",
        regularPrice: item.price,
        finalPrice: item.price,
      },
      item: {
        id: item.templateId,
        name: item.name,
        rarity: item.rarity,
        type: item.type,
      },
    })),
  });
});
