import { describe, it, expect } from 'vitest';
import { pertenceAGrupoAdmin } from '../gruposUsuario';

const grupo = (name: string) => ({ id: name, name }) as any;

describe('pertenceAGrupoAdmin', () => {
  it('é admin se qualquer um dos grupos for de administração', () => {
    expect(pertenceAGrupoAdmin([grupo('Requerimentos - Consultores'), grupo('Administradores')])).toBe(true);
  });

  it('não é admin sem grupo de administração', () => {
    expect(pertenceAGrupoAdmin([grupo('Coordenadores e Gerentes'), grupo('Requerimentos - Consultores')])).toBe(false);
  });

  it('não é admin sem grupos', () => {
    expect(pertenceAGrupoAdmin([])).toBe(false);
    expect(pertenceAGrupoAdmin(undefined)).toBe(false);
  });
});
