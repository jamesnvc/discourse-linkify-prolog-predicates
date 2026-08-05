import { withPluginApi } from "discourse/lib/plugin-api";
import { traverseNodes } from '../lib/utilities';

export default {
  name: 'discourse-linkify-prolog-predicates-initializer',
  initialize(){
    withPluginApi("0.8.7", api => {

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

      let createLink = function(text, url, title) {
        var link = document.createElement('a');
        link.innerHTML = text;
        link.href = url;
        link.rel = 'nofollow';
        link.target = '_blank';
        link.title = title;
        link.className = 'linkify-word no-track-link';
        return link;
      };

      api.decorateCooked(
        $elem => traverseNodes($elem[0], createLink, skipTags, skipClasses),
        {'id': 'linkify-prolog-predicates-theme'});
    });
  }
};
