-- Saldo Parcial: o Customer Success sai da cópia gravada nos agendamentos
--
-- Até aqui a tela copiava o email_gestor (Customer Success) da empresa para
-- banco_horas_envio_agendamentos.emails_cc ao marcá-la, e o sync-api enviava
-- com esse texto. Trocar o CS no cadastro não mudava o agendamento, e num
-- agendamento com várias empresas cada CS recebia o saldo de todas.
--
-- Agora o sync-api lê o CS atual de cada empresa a cada envio e o põe em cópia
-- só no e-mail daquela empresa; emails_cc guarda apenas as cópias extras.
--
-- Esta migration tira de emails_cc o CS ATUAL das empresas de cada agendamento
-- (comparação sem diferenciar maiúsculas e espaços), mantendo a ordem dos demais.
-- Não mexe em quem é CS de OUTRA empresa: em 25/11/2026 dois e-mails nessa
-- situação estavam na cópia de 6 e 8 agendamentos, de propósito.
-- Mudar emails_cc não zera proxima_execucao (o trigger só olha a regra).
--
-- Aplicar DEPOIS de publicar o sync-api novo: antes dele, o envio sairia sem o CS.

UPDATE public.banco_horas_envio_agendamentos a
   SET emails_cc = coalesce(
         (SELECT array_agg(u.email ORDER BY u.ordem)
            FROM unnest(a.emails_cc) WITH ORDINALITY AS u(email, ordem)
           WHERE NOT EXISTS (SELECT 1
                               FROM public.banco_horas_envio_agendamento_empresas ae
                               JOIN public.empresas_clientes ec ON ec.id = ae.empresa_id
                              WHERE ae.agendamento_id = a.id
                                AND lower(trim(ec.email_gestor)) = lower(trim(u.email)))),
         '{}'::text[])
 WHERE EXISTS (SELECT 1
                 FROM unnest(a.emails_cc) AS e(email)
                 JOIN public.banco_horas_envio_agendamento_empresas ae ON ae.agendamento_id = a.id
                 JOIN public.empresas_clientes ec ON ec.id = ae.empresa_id
                WHERE lower(trim(ec.email_gestor)) = lower(trim(e.email)));
