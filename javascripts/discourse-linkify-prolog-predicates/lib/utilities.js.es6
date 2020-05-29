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

const removeParens = (word) => word.replace(/^[(]/, '').replace(/[)][/]{1,2}[0-9]+$/, '');

const findAndReplaceMatches = function(text, createNode) {
  const res = [
    /(\s|[.;,!?…\([{]|^)((?:[a-z][a-zA-Z_]*:)?[a-z][a-zA-Z0-9_]*[/]{1,2}[0-9][1-9]*)(?=[:.;,!?…\]})]|\s|$)/g,
    /(\s|[.;,!?…\([{]|^)([(][^)A-Za-z]+[)][/]{1,2}[0-9][1-9]*)(?=[:.;,!?…\]})]|\s|$)/g,
    /(\s|[.;,!?…\([{]|^)([^)A-Za-z]+[/]{1,2}[0-9][1-9]*)(?=[:.;,!?…\]})]|\s|$)/g
  ];
  const matches = res.flatMap(re => executeRegex(re, text.data));
  const matchedWords = matches.map(([_1, _2, word]) => removeParens(word));
  fetch("https://www.swi-prolog.org/doc_link",
        {method: 'POST',
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify(matchedWords)})
    .then(resp => resp.json())
    .then(info => {
      const validPreds = new Set(Object.entries(info)
                                 .filter(([k, v]) => !!v)
                                 .map(([k, _]) => k));
      // Sort matches according to index, descending order
      // Got to work backwards not to muck up string
      const sortedMatches = matches
            .filter(p => validPreds.has(removeParens(p)))
            .sort((m, n) => n.index - m.index);
      modifyText(createNode, text, info, sortedMatches);
    });
};

const isSkippedClass = function(classes, skipClasses) {
  // Return true if at least one of the classes should be skipped
  return classes && classes.split(" ").some(cls => cls in skipClasses);
};

const traverseNodes = function(elem, createNode, skipTags, skipClasses) {
  // work backwards so changes do not break iteration
  for(let i = elem.childNodes.length - 1; i >=0; i--) {
    let child = elem.childNodes[i];
    if (child.nodeType === 1) {
      let tag = child.nodeName.toLowerCase();
      let cls = child.getAttribute("class");
      if (!(tag in skipTags) && !isSkippedClass(cls, skipClasses)) {
        traverseNodes(child, createNode, skipTags, skipClasses);
      }
    } else if (child.nodeType === 3) {
      findAndReplaceMatches(child, createNode);
    }
  }
};

export { traverseNodes };
