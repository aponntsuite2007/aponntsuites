-- Completar seed de casos legales
-- Insertar etapas del caso 3 (ID: 3)
INSERT INTO legal_case_stages (case_id, stage, sub_status, start_date, end_date, notes, recorded_by, sequence_order) VALUES
(3, 'prejudicial', 'notificado', '2024-03-15', '2024-03-25', 'Despido comunicado', '766de495-e4f3-4e91-a509-1a495c52e15c', 1),
(3, 'mediation', 'audiencia_realizada', '2024-03-26', '2024-04-08', 'SECLO fracasado', '766de495-e4f3-4e91-a509-1a495c52e15c', 2),
(3, 'judicial', 'sentencia_emitida', '2024-04-10', '2024-09-30', 'Sentencia favorable', '766de495-e4f3-4e91-a509-1a495c52e15c', 3),
(3, 'appeal', 'en_tramite', '2024-10-01', null, 'Pendiente Camara', '766de495-e4f3-4e91-a509-1a495c52e15c', 4);

-- Timeline del caso 3
INSERT INTO legal_case_timeline_events (case_id, event_type, title, description, event_date, importance, is_milestone, created_by) VALUES
(3, 'document_sent', 'Carta de despido enviada', 'Notificacion del despido', '2024-03-15', 'high', true, '766de495-e4f3-4e91-a509-1a495c52e15c'),
(3, 'stage_change', 'Inicio SECLO', 'Convocatoria a mediacion', '2024-03-26', 'normal', false, '766de495-e4f3-4e91-a509-1a495c52e15c'),
(3, 'hearing_held', 'Audiencia SECLO', 'Sin acuerdo', '2024-04-08', 'high', true, '766de495-e4f3-4e91-a509-1a495c52e15c'),
(3, 'document_filed', 'Demanda presentada', 'Actora presenta demanda', '2024-04-10', 'critical', true, '766de495-e4f3-4e91-a509-1a495c52e15c'),
(3, 'document_filed', 'Contestacion', 'Empresa contesta demanda', '2024-05-15', 'high', false, '766de495-e4f3-4e91-a509-1a495c52e15c'),
(3, 'hearing_held', 'Audiencia testimonial', '4 testigos declararon', '2024-07-10', 'normal', false, '766de495-e4f3-4e91-a509-1a495c52e15c'),
(3, 'sentence_issued', 'Sentencia 1ra instancia', 'Fallo favorable a empresa', '2024-09-20', 'critical', true, '766de495-e4f3-4e91-a509-1a495c52e15c'),
(3, 'appeal_filed', 'Recurso de apelacion', 'Actora apela', '2024-10-01', 'high', true, '766de495-e4f3-4e91-a509-1a495c52e15c');

-- Alerta pendiente para caso 3
INSERT INTO legal_document_alerts (case_id, company_id, alert_type, message, severity, due_date)
VALUES (3, 11, 'response_overdue', 'Pendiente resolucion de Camara de Apelaciones', 'info', '2025-03-01');
