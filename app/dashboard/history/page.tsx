import HistoryScreen from "../../../components/HistoryScreen";
import { getArticlesAction } from "../../actions";
import { ArtigoNoticia } from "../../../types";

export default async function HistoryPage() {
  const articles: ArtigoNoticia[] = await getArticlesAction();

  return <HistoryScreen initialArticles={articles} />;
}