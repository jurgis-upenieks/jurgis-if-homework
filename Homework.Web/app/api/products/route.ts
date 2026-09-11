import { createCollectionRoute } from "@/generic-configurables/catalog";
import { catalog } from "@/app/catalog";

export const GET = createCollectionRoute(catalog);
