// String.prototype.matchAll would do this, but Safari doesn't implement it
const executeRegex = function(regex, str) {
  let matches = [];
  if (!(regex instanceof RegExp)) {
    return;
  }
  let match = regex.exec(str);
  if (match === null) {
    return matches;
  }
  do {
    matches.push(match);
  }
  while (regex.global && (match = regex.exec(str)) !== null);
  return matches;
};

const percentEncode = (s) => encodeURIComponent(s).replace(/%2F/, '/');

const modifyText = (createNode, text, info, matches) => {
  for (const match of matches) {
    const matchedLeftBoundary = match[1];
    const matchedWord = match[2];
    // We need to protect against multiple matches of the same word or phrase
    if (!(match.index + matchedLeftBoundary.length + matchedWord.length > text.data.length)) {
          text.splitText(match.index + matchedLeftBoundary.length);
          text.nextSibling.splitText(matchedWord.length);
          text.parentNode.replaceChild(
            createNode(matchedWord,
                       "https://www.swi-prolog.org/pldoc/doc_for?object=" + percentEncode(matchedWord),
                       info[matchedWord].summary
                      ),
            text.nextSibling);
    }
  }
};

const removeParens = (word) => word.replace(/^[(]/, '').replace(/[)]([/]{1,2}[0-9]+)$/, '$1');

const predicate_res = [
  /(\s|[.;,!?…\([{]|^)((?:[a-z][a-zA-Z_]*:)?[a-z][a-zA-Z0-9_]*[/]{1,2}[0-9][1-9]*)(?=[:.;,!?…\]})]|\s|$)/g,
  /(\s|[.;,!?…\([{]|^)([(][^)A-Za-z]+[)][/]{1,2}[0-9][1-9]*)(?=[:.;,!?…\]})]|\s|$)/g,
  /(\s|[.;,!?…\([{]|^)([^)A-Za-z]+[/]{1,2}[0-9][1-9]*)(?=[:.;,!?…\]})]|\s|$)/g
];

const extractAllMatches = (nodes) => {
  return nodes.map(node => [node, predicate_res.flatMap(re => executeRegex(re, node.data))]);
};

const processNodes = (createNode, nodes) => {
  const nodeMatches = extractAllMatches(nodes);
  const matchedWords = nodeMatches
        .flatMap(([_, matches]) => matches)
        .map(([_1, _2, word]) => removeParens(word));
  console.log("nodes", nodes, "words", [...new Set(matchedWords)]);
  fetch("https://www.swi-prolog.org/doc_link",
        {method: 'POST',
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify([...new Set(matchedWords)])})
    .then(resp => resp.json())
    .then(info => {
      const validPreds = new Set(Object.entries(info)
                                 .filter(([k, v]) => !!v)
                                 .map(([k, _]) => k));
      for (const [node, matches] of nodeMatches) {
        const sortedMatches = matches
              .filter(p => validPreds.has(removeParens(p[2])))
              .sort((m, n) => n.index - m.index);
        modifyText(createNode, node, info, sortedMatches);
      }
    })
    .catch(err => {
      console.error("ERROR", err);
    });
};

const isSkippedClass = function(classes, skipClasses) {
  // Return true if at least one of the classes should be skipped
  return classes && classes.split(" ").some(cls => cls in skipClasses);
};

const traverseNodesRec = function(elem, skipTags, skipClasses, nodes) {
  // work backwards so changes do not break iteration
  for(let i = elem.childNodes.length - 1; i >=0; i--) {
    let child = elem.childNodes[i];
    if (child.nodeType === 1) {
      let tag = child.nodeName.toLowerCase();
      let cls = child.getAttribute("class");
      if (!(tag in skipTags) && !isSkippedClass(cls, skipClasses)) {
        traverseNodesRec(child, skipTags, skipClasses, nodes);
      }
    } else if (child.nodeType === 3) {
      nodes.push(child);
    }
  }
};

const traverseNodes = function(elem, createNode, skipTags, skipClasses) {
  const nodes = [];
  traverseNodesRec(elem, skipTags, skipClasses, nodes);
  processNodes(createNode, nodes);
};

export { traverseNodes };
