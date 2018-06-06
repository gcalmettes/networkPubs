# networkPubs
A quick way to get a network of science investigators based on their common publications.

**Notes:** 

- This is a pretty naive app, everything is done client side (fetching the data, analyzing the data), so this is not really optimized or ready for production.
- Only data from the [NCBI Pubmed database](https://www.ncbi.nlm.nih.gov/pubmed/) are used, so the resulting network is biased toward biomedical sciences (and journal indexed in the Pubmed database).
- Any valid Pubmed query is accepted (see the [About](https://gcalmettes.github.io/networkPubs/about.html) section) but the more general the query will be, the more disconnected the resulting network will be.
-  In order to limit the processing time, only the result from the most recent 60 publications matching the Pubmed query are analyzed.
