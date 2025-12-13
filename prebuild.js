import fs from'fs';
import _ from 'lodash';

function getControls () {
  const [header,...grid] = fs.readFileSync('./data/classification_controls.csv','utf-8').split('\n');
  const objects = [];
  grid.map(row => {
    const obj = {};
    const cols = row.split(',');
    header.split(',').map((h,i) => {
      obj[h] = cols[i];
    });
    objects.push(obj);
  });

  const deduplicated = [];
  const groups = _.groupBy(objects,'column');
  for (const [column, rows] of Object.entries(groups)) {

    const assetClassGroups = _.groupBy(rows, 'summary_asset_class');
    for (const [assetClass, assetClassRows] of Object.entries(assetClassGroups)) {
      const controlGroups = _.groupBy(assetClassRows, 'control');
      if (Object.entries(controlGroups).length == 1) {
        deduplicated.push({
          column,
          summary_asset_class: assetClass,
          strategy: "Any",
          control: Object.entries(controlGroups)[0][0],
        });
      } else {
        assetClassRows.map(row => deduplicated.push(row))
        
      }
    }
    
  }
  
  return [objects,deduplicated]
}
const [objects,deduplicated]= getControls();
fs.writeFileSync('data/classification_controls.json',JSON.stringify(objects,undefined,2));
fs.writeFileSync('data/classification_controls_dedup.json',JSON.stringify(deduplicated,undefined,2));

