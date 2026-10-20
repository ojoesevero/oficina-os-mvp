import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wypabdhhzgkfrfbnslat.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function setupBucket() {
  console.log('--- Configurando Bucket fotos-os no Supabase Storage via Service Key ---');
  
  const { data: buckets, error: listError } = await adminSupabase.storage.listBuckets();
  if (listError) {
    console.error('Erro ao listar buckets:', listError);
  } else {
    console.log('Buckets atuais:', buckets);
    const exists = buckets.find((b) => b.name === 'fotos-os' || b.id === 'fotos-os');
    if (!exists) {
      console.log('Criando bucket publico fotos-os...');
      const { data, error } = await adminSupabase.storage.createBucket('fotos-os', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      });
      if (error) {
        console.error('Erro ao criar bucket:', error);
      } else {
        console.log('✅ Bucket "fotos-os" criado com sucesso:', data);
      }
    } else {
      console.log('✅ Bucket fotos-os já existe!');
    }
  }

  // Testar upload de um arquivo de teste
  console.log('Testando upload no bucket fotos-os...');
  const fakeFile = Buffer.from('fake-image-bytes-for-test');
  const fileName = `test-file-${Date.now()}.txt`;
  const { data: uploadData, error: uploadError } = await adminSupabase.storage
    .from('fotos-os')
    .upload(fileName, fakeFile, {
      contentType: 'text/plain',
      upsert: true
    });

  if (uploadError) {
    console.error('❌ Erro no upload:', uploadError.message);
  } else {
    console.log('✅ Upload com sucesso:', uploadData);
    const { data: pubData } = adminSupabase.storage.from('fotos-os').getPublicUrl(fileName);
    console.log('✅ URL Pública gerada:', pubData.publicUrl);
  }
}

setupBucket();
