import { PRODUCT_PROGRESS, calculateProductProgress } from '../src/productProgress.js';
const total=calculateProductProgress();
if(total<0||total>100)throw new Error('Invalid product progress.');
if(PRODUCT_PROGRESS.musicComposition>=100||PRODUCT_PROGRESS.generation>=100||PRODUCT_PROGRESS.conversationalEditing>=100)throw new Error('Incomplete major capabilities incorrectly marked complete.');
console.log(`product-progress: ${total}% (honest whole-product baseline)`);
