const fs = require('fs');
const lcovPath = 'coverage/lcov.info';
if (!fs.existsSync(lcovPath)) {
  console.log('lcov.info not found');
  process.exit(1);
}
const lcov = fs.readFileSync(lcovPath, 'utf8');

let stats = {
  DA: { total: 0, covered: 0 },
  BRDA: { total: 0, covered: 0 },
  FNDA: { total: 0, covered: 0 }
};

lcov.split('\n').forEach(line => {
  if (line.startsWith('DA:')) {
    stats.DA.total++;
    if (parseInt(line.split(',')[1]) > 0) stats.DA.covered++;
  } else if (line.startsWith('BRDA:')) {
    stats.BRDA.total++;
    // BRDA:<line>,<block>,<branch>,<hits>
    const hits = parseInt(line.split(',')[3]);
    if (!isNaN(hits) && hits > 0) stats.BRDA.covered++;
  } else if (line.startsWith('FNDA:')) {
    stats.FNDA.total++;
    if (parseInt(line.split(',')[0].split(':')[1]) > 0) stats.FNDA.covered++;
  }
});

console.log(`Line Coverage: ${(stats.DA.covered / stats.DA.total * 100).toFixed(2)}%`);
console.log(`Branch Coverage: ${(stats.BRDA.covered / stats.BRDA.total * 100).toFixed(2)}%`);
console.log(`Function Coverage: ${(stats.FNDA.covered / stats.FNDA.total * 100).toFixed(2)}%`);
