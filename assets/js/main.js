import { setupHero } from "./hero.js?v=20260923";
import { setupCommon, setupHome } from "./common.js?v=20260923";
import { setupSearch } from "./search.js?v=20260923";
import { setupLearningHub, setupLesson } from "./learning.js?v=20260923";
import { setupStories } from "./stories.js?v=20260923";
import { setupStudio } from "./studio.js?v=20260923";
import { setupAccount } from "./account.js?v=20260923";
import { setupNavigation } from "./navigation.js?v=20260923";
import { setupMotion } from "./motion.js?v=20260923";
const framework = document.getElementById("framework-cdn");
if (framework) {
  if (framework.sheet) framework.media = "all";
  else
    framework.addEventListener(
      "load",
      () => {
        framework.media = "all";
      },
      { once: true },
    );
}
setupMotion();
setupCommon();
setupHome();
setupSearch();
setupLearningHub();
setupLesson();
setupStories();
setupStudio();
setupAccount();
setupNavigation();
setupHero();
document.documentElement.dataset.appReady = "true";
