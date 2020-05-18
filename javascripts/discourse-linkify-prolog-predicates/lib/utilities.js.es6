// String.prototype.matchAll would do this, but Safari doesn't implement it
const executeRegex = function(regex, str) {
  let matches = [];
  if (!(regex instanceof RegExp)) {
    return;
  }
  const match = regex.exec(str);
  if (match === null) {
    return;
  }
  do {
    matches.push(match);
  }
  while (regex.global && (match = regex.exec(str)) !== null);
  return matches;
};

const isValidPredicate = (pred) => {
  return fetch(`https://www.swi-prolog.org/doc_link?for=${pred}`)
    .then(resp => resp.ok && resp.json());
};

const modifyText = function(text, createNode) {
  const re = /(\s|[.;,!?…\([{]|^)((?:[a-z][a-zA-Z_]*:)?[a-z][a-zA-Z0-9_]*[/]{1,2}[0-9][1-9]*)(?=[:.;,!?…\]})]|\s|$)/g;
  const matches = executeRegex(re, text.data);
  // Sort matches according to index, descending order
  // Got to work backwards not to muck up string
  const sortedMatches = matches.sort((m, n) => n.index - m.index);
  for (let i = 0; i < sortedMatches.length; i++) {
    let match = sortedMatches[i];
    let matchedLeftBoundary = match[1];
    let matchedWord = match[2];
    // We need to protect against multiple matches of the same word or phrase
    if (match.index + matchedLeftBoundary.length + matchedWord.length > text.data.length) {
      continue;
    }
    isValidPredicate(matchedWord).then((isValid) => {
      if (isValid) {
        text.splitText(match.index + matchedLeftBoundary.length);
        text.nextSibling.splitText(matchedWord.length);
        text.parentNode.replaceChild(
          createNode(matchedWord,
                     `https://www.swi-prolog.org/pldoc/doc_for?object=${matchedWord}`),
          text.nextSibling);
      }
    });
  }
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
      modifyText(child, createNode);
    }
  }
};

export {traverseNodes}