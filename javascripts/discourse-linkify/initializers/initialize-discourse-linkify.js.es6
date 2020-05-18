import { withPluginApi } from "discourse/lib/plugin-api";
import { traverseNodes } from '../lib/utilities';

export default {
  name: 'discourse-linkify-prolog-predicates-initializer',
  initialize(){
    withPluginApi("0.8.7", api => {

      // roughly guided by https://stackoverflow.com/questions/8949445/javascript-bookmarklet-to-replace-text-with-a-link
      let skipTags = {
        'a': 1,
        'iframe': 1,
      };
  
      settings.excluded_tags.split('|').forEach(tag => {
        tag = tag.trim().toLowerCase();
        if (tag !== '') {
          skipTags[tag] = 1;
        }
      });

      let skipClasses = {};

      settings.excluded_classes.split('|').forEach(cls => {
        cls = cls.trim().toLowerCase();
        if (cls !== '') {
          skipClasses[cls] = 1;
        }
      });
      
      let createLink = function(text, url) {
        var link = document.createElement('a');
        link.innerHTML = text;
        link.href = url;
        link.rel = 'nofollow';
        link.target = '_blank';
        link.className = 'linkify-word no-track-link';
        return link;
      };

      let Action = function(inputListName, method) {
        this.inputListName = inputListName;
        this.createNode = method;
        this.inputs = {};
      };
  
      api.decorateCooked($elem => {
        traverseNodes($elem[0], createLink, skipTags, skipClasses);
      }, {'id': 'linkify-words-theme'});
    });
  }
}
