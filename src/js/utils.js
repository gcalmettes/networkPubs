function retrievePubmedQuery(query, limit=60){
	const path = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${query}&retmax=${limit}&retmode=json`
	return fetch(path)
		.then(response => response.json())
		.then(data => data.esearchresult.idlist)
}

// function getResultIterator2(query, limit=60){
// 	return {
//     [Symbol.asyncIterator]: async function*() {
//     	const idList = await retrievePubmedQuery(query, limit)
//         for (const id of idList) {
//         	const path =`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${id}&retmode=json`
//         	const summary = await fetch(path)
//         		.then(response => response.json())
//         		.then(summary => ({
//         			title: summary.result[id].title,
// 							authors: summary.result[id].authors,
// 							uid: summary.result[id].uid
//         		}))
//           yield summary
//         }
//       }
//     }
// }

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function* getResultIterator(query, limit=60){
  const idList = await retrievePubmedQuery(query, limit)
	for await (const id of idList) {
		const path =`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${id}&retmode=json`
		await sleep(300)
    const summary = await fetch(path)
			.then(response => response.json())
			.then(summary => ({
				title: summary.result[id].title,
				authors: summary.result[id].authors,
				uid: summary.result[id].uid
			}))
	  yield summary
	}
}


function constructGraph(publications, previousGraph, width, height, filterMax){
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

	let authorConnectionsFiltered = authorConnections
	let authorsFiltered = Object.keys(authorPub)
	if (filterMax){
		console.log("keeping only the top connections!")
		// keep only the top *max* top connections
		authorConnectionsFiltered = Object.entries(authorConnections)
			.sort((a, b) => b[1]-a[1])
			.slice(0, max)	
			.reduce((authorPairs, pair) => {
				authorPairs[pair[0]] =  pair[1]
				return authorPairs
			}, {})
		// keep only authors present in those top connections
		authorsFiltered = Object.keys(authorConnectionsFiltered).reduce((authorList, key) => {
			[...key.split("_")].forEach(d => authorList.add(d))
			return authorList
		}, new Set())
	}

	return {
		edges: Object.keys(authorConnectionsFiltered).map(key => {
			const [author1, author2] = [...key.split("_")]
			return {id: key, pair: [author1, author2], source: author1, target: author2, size: authorConnectionsFiltered[key]}
		}),
		nodes: [...authorsFiltered].map(author => {
			let authorNode
			if (previousGraph) authorNode = previousGraph.nodes.filter(d => d.id == author)[0]
			// return {id: author, size: authorPub[author], x: Math.random()*width, y: Math.random()*height}
			// return {id: author, size: authorPub[author]}
			return {id: author, size: authorPub[author], x: authorNode ? authorNode.x : Math.random()*width, y: authorNode ? authorNode.y : Math.random()*height}
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

function downloadToJSON(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}


// Range sliders
function getVals(){
  // Get slider values
  var parent = this.parentNode;
  var slides = parent.getElementsByTagName("input");
    var slide1 = parseFloat( slides[0].value );
    var slide2 = parseFloat( slides[1].value );
  // Neither slider will clip the other, so make sure we determine which is larger
  if( slide1 > slide2 ){ var tmp = slide2; slide2 = slide1; slide1 = tmp; }
  
  var displayElement = parent.getElementsByClassName("rangeValues")[0];
      displayElement.innerHTML = slide1 + " / " + slide2;
}

window.onload = function(){
  // Initialize Sliders
  var sliderSections = document.getElementsByClassName("range-slider");
      for( var x = 0; x < sliderSections.length; x++ ){
        var sliders = sliderSections[x].getElementsByTagName("input");
        for( var y = 0; y < sliders.length; y++ ){
          if( sliders[y].type ==="range" ){
            sliders[y].oninput = getVals;
            // Manually trigger event first time to display values
            sliders[y].oninput();
          }
        }
      }
}