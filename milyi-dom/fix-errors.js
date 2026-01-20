const fs = require('fs');
const path = require('path');

// Файлы для исправления
const filesToFix = [
  {
    file: 'apps/backend/src/bookings/bookings.service.ts',
    fixes: [
      { search: 'body: `${booking.listing.title} - ${nights} nights`,', replace: 'body: `Booking - ${nights} nights`,' },
      { search: 'body: `${updated.listing.title} - status: ${dto.status.toLowerCase()}`,', replace: 'body: `Booking status: ${dto.status.toLowerCase()}`,' }
    ]
  },
  {
    file: 'apps/backend/src/listings/amenities.service.ts',
    fixes: [
      { search: '{ category: \'asc\' },', replace: '{ name: \'asc\' },' },
      { search: 'where: { category },', replace: 'where: { name: category },' },
      { search: 'category: true,', replace: 'name: true,' },
      { search: 'distinct: [\'category\'],', replace: 'distinct: [\'name\'],' },
      { search: 'return amenities.map(a => a.category);', replace: 'return amenities.map(a => a.name);' }
    ]
  }
];

// Применяем исправления
filesToFix.forEach(({ file, fixes }) => {
  const filePath = path.join(__dirname, file);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    fixes.forEach(({ search, replace }) => {
      content = content.replace(new RegExp(search, 'g'), replace);
    });
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});

console.log('Fixes applied successfully!');