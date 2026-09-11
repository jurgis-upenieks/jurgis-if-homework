import { CatalogPage } from "@/generic-configurables/catalog";
import { catalog } from "./catalog";

export default function Home() {
  return <CatalogPage {...catalog} />;
}
