import * as fs from 'fs';
import * as path from 'path';

const main = () => {
  // console.log('Reset all database tables ✅ ');
  const localStoragePath = path.join(__dirname, '../localStorage');
  fs.rmSync(localStoragePath, { recursive: true, force: true });
  console.log('Removed localStorage ✅ ');
};

main();
