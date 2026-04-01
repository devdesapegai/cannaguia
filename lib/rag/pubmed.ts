/**
 * PubMed E-Utilities API client
 * Free API, no key required (rate limited to 3 req/sec without key)
 * Docs: https://www.ncbi.nlm.nih.gov/books/NBK25501/
 */

const BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

interface PubMedArticle {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  year: string;
  doi: string;
}

interface SearchResult {
  count: number;
  ids: string[];
}

export async function searchPubMed(
  query: string,
  maxResults: number = 5
): Promise<SearchResult> {
  const params = new URLSearchParams({
    db: "pubmed",
    term: `(${query}) AND (cannabis OR cannabinoid OR CBD OR THC OR cannabidiol OR tetrahydrocannabinol)`,
    retmax: String(maxResults),
    retmode: "json",
    sort: "relevance",
  });

  const res = await fetch(`${BASE_URL}/esearch.fcgi?${params}`);
  if (!res.ok) {
    throw new Error(`PubMed search failed: HTTP ${res.status}`);
  }
  const data = await res.json();

  return {
    count: parseInt(data.esearchresult?.count ?? "0"),
    ids: data.esearchresult?.idlist || [],
  };
}

export async function fetchArticles(
  pmids: string[]
): Promise<PubMedArticle[]> {
  if (pmids.length === 0) return [];

  const params = new URLSearchParams({
    db: "pubmed",
    id: pmids.join(","),
    retmode: "xml",
    rettype: "abstract",
  });

  const res = await fetch(`${BASE_URL}/efetch.fcgi?${params}`);
  if (!res.ok) {
    throw new Error(`PubMed fetch failed: HTTP ${res.status}`);
  }
  const xml = await res.text();

  return parsePubMedXML(xml);
}

function parsePubMedXML(xml: string): PubMedArticle[] {
  const articles: PubMedArticle[] = [];

  // Simple XML parsing without external dependencies
  const articleMatches = xml.split("<PubmedArticle>");

  for (const chunk of articleMatches.slice(1)) {
    const pmid = extractTag(chunk, "PMID") || "";
    const title = extractTag(chunk, "ArticleTitle") || "";
    const abstract = extractAbstract(chunk);
    const journal = extractTag(chunk, "Title") || "";
    const year =
      extractTag(chunk, "Year") ||
      extractTag(chunk, "MedlineDate") ||
      "";
    const doi = extractDOI(chunk);

    const authors: string[] = [];
    const authorMatches = chunk.match(
      /<Author[\s\S]*?<\/Author>/g
    );
    if (authorMatches) {
      for (const author of authorMatches.slice(0, 3)) {
        const lastName = extractTag(author, "LastName") || "";
        const initials = extractTag(author, "Initials") || "";
        if (lastName) authors.push(`${lastName} ${initials}`);
      }
    }

    if (title) {
      articles.push({ pmid, title, abstract, authors, journal, year, doi });
    }
  }

  return articles;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1].replace(/<[^>]+>/g, "").trim() : null;
}

function extractAbstract(xml: string): string {
  const abstractSection = xml.match(
    /<Abstract>([\s\S]*?)<\/Abstract>/
  );
  if (!abstractSection) return "";

  const texts = abstractSection[1].match(
    /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g
  );
  if (!texts) return "";

  return texts
    .map((t) => {
      const labelMatch = t.match(/Label="([^"]+)"/);
      const content = t
        .replace(/<[^>]+>/g, "")
        .trim();
      return labelMatch ? `${labelMatch[1]}: ${content}` : content;
    })
    .join(" ");
}

function extractDOI(xml: string): string {
  const match = xml.match(
    /<ArticleId IdType="doi">([^<]+)<\/ArticleId>/
  );
  return match ? match[1] : "";
}

export async function searchAndFetch(
  query: string,
  maxResults: number = 3
): Promise<PubMedArticle[]> {
  const { ids } = await searchPubMed(query, maxResults);
  return fetchArticles(ids);
}
