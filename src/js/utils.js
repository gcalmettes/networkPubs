async function getPubIdsforAuthor(author) {
	// Return a list of publications IDs for the given author
	const path = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${author}[author]&retmode=json`
	const idList = await d3.json(path).then(data => data.esearchresult.idlist);
	return idList
}

async function getPublicationFromIds(idList) {
	// Return a list of publications from a list of publications IDs
	let publications = []
	for (let i=0; i<idList.length; i++) {
		const id = idList[i]
		const path =`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${id}&retmode=json`
		const summary = await d3.json(path).then(result => result);
		publications.push({
				title: summary.result[id].title,
				authors: summary.result[id].authors,
				uid: summary.result[id].uid
			})
	}
	return publications
}

async function getCitationsForAuthor(author){
	const idList = await getPubIdsforAuthor(author).then(result => result)
	const publications = await getPublicationFromIds(idList).then(result => result)
	return publications
}


async function getAuthorGraph(authorList, width=500, height=500){

	const allPromises = authorList.map(author => getCitationsForAuthor(author))
	const publications = await Promise.all(allPromises).then(values => [].concat(...values))



	// all pairs of authors per publications
	const authorshipMap = publications.map(pub => getCombinationsOfSize(pub.authors, 2, "name"))
	// all pairs of authors in one array
	const mergeAuthorshipMap = [].concat(...authorshipMap);
	// graph
	const authorConnections = mergeAuthorshipMap.reduce((authorPairs, authors) => {
		const key = `${authors[0].replace(/\s+/g, '')}_${authors[1].replace(/\s+/g, '')}`
		authorPairs[key] =  authorPairs[key] ? authorPairs[key]+1 : 1
		return authorPairs
	}, {})

	// number of publications per author
	const authorPub = publications.reduce((authorSet, publication) => {
		const names = publication.authors.map(author => author.name.replace(/\s+/g, ''))
		for (let i=0; i<names.length; i++){
			authorSet[names[i]] = authorSet[names[i]] ? authorSet[names[i]]+1 : 1
		}
		return authorSet
	}, {})

	return {
		edges: Object.keys(authorConnections).map(key => {
			const [author1, author2] = [...key.split("_")]
			return {id: key, pair: [author1, author2], source: author1, target: author2, size: authorConnections[key]}
		}),
		nodes: Object.keys(authorPub).map(author => {
			return {id: author, size: authorPub[author], x: Math.random()*width, y: Math.random()*height}
		})
	}
}


function getCombinationsOfSize(set, k, property=undefined) {
	let i, j, combs, head, tailcombs;
	// There is no way to take e.g. sets of 5 elements from a set of 4.
	if (k > set.length || k <= 0) {
		return [];
	}
	// k-sized set has only one K-sized subset.
	if (k == set.length) {
		if (property) {
			return [set.map(element => element[property]).sort()]
		} else {
			return [set.sort()];
		}
	}
	// There is n 1-sized subsets in a n-sized set.
	if (k == 1) {
		if (property) {
			return set.map(element => element[property]).sort()
		} else {
			return set.map(element => element).sort();
		}
	}
	
	// Assert {1 < k < set.length}
	
	// Algorithm description:
	// To get k-combinations of a set, we want to join each element
	// with all (k-1)-combinations of the other elements. The set of
	// these k-sized sets would be the desired result. However, as we
	// represent sets with lists, we need to take duplicates into
	// account. To avoid producing duplicates and also unnecessary
	// computing, we use the following approach: each element i
	// divides the list into three: the preceding elements, the
	// current element i, and the subsequent elements. For the first
	// element, the list of preceding elements is empty. For element i,
	// we compute the (k-1)-computations of the subsequent elements,
	// join each with the element i, and store the joined to the set of
	// computed k-combinations. We do not need to take the preceding
	// elements into account, because they have already been the i:th
	// element so they are already computed and stored. When the length
	// of the subsequent list drops below (k-1), we cannot find any
	// (k-1)-combs, hence the upper limit for the iteration:
	combs = [];
	for (i = 0; i < set.length - k + 1; i++) {
		// head is a list that includes only our current element.
		if (property) {
			head = set.slice(i, i + 1).map(element => element[property])
		} else {
			head = set.slice(i, i + 1);
		}

		// We take smaller combinations from the subsequent elements
		tailcombs = getCombinationsOfSize(set.slice(i + 1), k - 1, property);
		// For each (k-1)-combination we join it with the current
		// and store it to the set of k-combinations.
		for (j = 0; j < tailcombs.length; j++) {
			combs.push(head.concat(tailcombs[j]).sort());
		}
	}
	return combs;
}

    