import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import {
  encontrarPrototipo,
  montarRegistroPrototipos,
  ESTADOS_PROTOTIPO,
  type EstadoPrototipo,
  type Prototipo,
  type PrototipoLoader,
} from '@/utils/prototipos';

// Rota exclusiva de desenvolvimento (registrada em App.tsx só com import.meta.env.DEV).
const REGISTRO_PADRAO = montarRegistroPrototipos(
  import.meta.glob('./prototipos/*.tsx') as Record<string, PrototipoLoader>
);

interface PrototiposProps {
  registro?: Prototipo[];
}

function ListaPrototipos({ registro, slugInvalido }: { registro: Prototipo[]; slugInvalido?: string }) {
  return (
    <AdminLayout>
      <div className="min-h-screen bg-bg-secondary">
        <div className="px-6 py-6 space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Protótipos</h1>
            <p className="text-muted-foreground mt-1">
              Telas com dados fictícios para validar layout antes da implementação. Disponível só em desenvolvimento.
            </p>
          </div>

          {slugInvalido && (
            <p className="text-sm text-red-500">Protótipo não encontrado: "{slugInvalido}".</p>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sonda-blue">Disponíveis</CardTitle>
              <CardDescription>Arquivos em src/pages/prototipos/</CardDescription>
            </CardHeader>
            <CardContent>
              {registro.length === 0 ? (
                <EmptyState
                  icon={<FlaskConical className="h-10 w-10" />}
                  title="Nenhum protótipo ainda"
                  description="Crie um arquivo em src/pages/prototipos/ seguindo a skill prototipo."
                />
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {registro.map(p => (
                    <li key={p.slug} className="py-3">
                      <Link to={`/prototipos/${p.slug}`} className="text-sonda-blue hover:underline font-medium">
                        {p.nome}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

function PainelEstado({ estado, onChange }: { estado: EstadoPrototipo; onChange: (e: EstadoPrototipo) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900">
      <Link to="/prototipos" className="px-2 text-xs text-muted-foreground hover:underline">
        Protótipos
      </Link>
      {ESTADOS_PROTOTIPO.map(({ valor, rotulo }) => (
        <Button
          key={valor}
          size="sm"
          variant={estado === valor ? 'default' : 'outline'}
          className={cn(estado === valor && 'bg-sonda-blue hover:bg-sonda-dark-blue')}
          onClick={() => onChange(valor)}
        >
          {rotulo}
        </Button>
      ))}
    </div>
  );
}

function Prototipos({ registro = REGISTRO_PADRAO }: PrototiposProps) {
  const { slug } = useParams();
  const [estado, setEstado] = useState<EstadoPrototipo>('dados');
  const prototipo = encontrarPrototipo(registro, slug);
  const Componente = useMemo(() => (prototipo ? lazy(prototipo.load) : null), [prototipo]);

  if (!Componente) return <ListaPrototipos registro={registro} slugInvalido={slug} />;

  return (
    <>
      <Suspense fallback={null}>
        <Componente estado={estado} />
      </Suspense>
      <PainelEstado estado={estado} onChange={setEstado} />
    </>
  );
}

export default Prototipos;
