const source=await (await fetch('https://raw.githubusercontent.com/bikeztagram-ai/bikeztagram-ai-build-v2/development/from-e2e-working-baseline/api/private-blob-read.js')).text();
if(!source.includes('process.env.BLOB_READ_WRITE_TOKEN'))throw new Error('Canonical BLOB_READ_WRITE_TOKEN is not used.');
if(!source.includes('process.env.PUBLIC_BLOB_READ_WRITE_TOKEN'))throw new Error('Legacy compatibility token fallback was removed.');
if(source.includes("process.env.PUBLIC_BLOB_READ_WRITE_TOKEN),failures"))throw new Error('Legacy token must not remain the primary token.');
console.log('PASS: Blob reader uses canonical BLOB_READ_WRITE_TOKEN with legacy fallback.');
