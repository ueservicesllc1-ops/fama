/**
 * FAMA — Endpoint Administrativo de Métricas y Estadísticas de Asistencia y Pastoral
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere autenticación con rol de Administrador o Pastor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  AttendanceSession,
  AttendanceRecord,
  Visitor,
  PastoralFollowUp,
  AttendanceStats,
} from '@/types/models';
import { SESSION_TYPES } from '@/lib/attendance/constants';

export async function GET(request: NextRequest) {
  const authCheck = await verifyAdminRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // Consultar en paralelo las colecciones necesarias
    const [sessionsSnap, recordsSnap, visitorsSnap, followUpsSnap] = await Promise.all([
      db.collection(FIRESTORE_COLLECTIONS.ATTENDANCE_SESSIONS).get(),
      db
        .collection(FIRESTORE_COLLECTIONS.ATTENDANCE_RECORDS)
        .where('status', '==', 'present')
        .get(),
      db.collection(FIRESTORE_COLLECTIONS.VISITORS).get(),
      db.collection(FIRESTORE_COLLECTIONS.PASTORAL_FOLLOWUPS).get(),
    ]);

    const sessions: AttendanceSession[] = [];
    sessionsSnap.forEach((doc) => {
      sessions.push({ ...(doc.data() as AttendanceSession), id: doc.id });
    });

    const activeSessions = sessions.filter((s) => s.status !== 'cancelled');

    const records: AttendanceRecord[] = [];
    recordsSnap.forEach((doc) => {
      records.push({ ...(doc.data() as AttendanceRecord), id: doc.id });
    });

    const visitors: Visitor[] = [];
    visitorsSnap.forEach((doc) => {
      visitors.push({ ...(doc.data() as Visitor), id: doc.id });
    });

    const followUps: PastoralFollowUp[] = [];
    followUpsSnap.forEach((doc) => {
      followUps.push({ ...(doc.data() as PastoralFollowUp), id: doc.id });
    });

    // Cálculos de Asistencia General
    const totalSessions = activeSessions.length;
    const totalAttendance = records.length;
    const membersAttendance = records.filter((r) => r.attendeeType === 'member').length;
    const visitorsAttendance = records.filter((r) => r.attendeeType === 'visitor').length;
    const averagePerSession =
      totalSessions > 0 ? Math.round((totalAttendance / totalSessions) * 10) / 10 : 0;

    // Métricas de Visitantes y Consentimiento
    const totalVisitors = visitors.length;
    const visitorsWithConsentCount = visitors.filter((v) => v.followUpConsent).length;
    const visitorsWithoutConsentCount = visitors.filter((v) => !v.followUpConsent).length;

    // Métricas de Seguimiento Pastoral
    const pendingFollowUpsCount = followUps.filter((f) => f.status === 'pending').length;
    const overdueFollowUpsCount = followUps.filter(
      (f) => f.status === 'pending' && f.nextStepDueDate && f.nextStepDueDate < today
    ).length;
    const completedFollowUpsCount = followUps.filter((f) => f.status === 'completed').length;

    // Desglose por Tipo de Sesión
    const attendanceBySessionType: Record<
      string,
      { label: string; count: number; sessionsCount: number }
    > = {};

    Object.keys(SESSION_TYPES).forEach((typeKey) => {
      const typeInfo = SESSION_TYPES[typeKey as keyof typeof SESSION_TYPES];
      attendanceBySessionType[typeKey] = {
        label: typeInfo.label,
        count: 0,
        sessionsCount: 0,
      };
    });

    activeSessions.forEach((s) => {
      if (!attendanceBySessionType[s.type]) {
        attendanceBySessionType[s.type] = {
          label: s.type,
          count: 0,
          sessionsCount: 0,
        };
      }
      attendanceBySessionType[s.type].sessionsCount += 1;
    });

    records.forEach((r) => {
      if (attendanceBySessionType[r.sessionType]) {
        attendanceBySessionType[r.sessionType].count += 1;
      }
    });

    // Tendencia Mensual (últimos 12 meses)
    const monthNames = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];

    const now = new Date();
    const monthlyMap: Record<
      string,
      { month: string; monthName: string; total: number; members: number; visitors: number; sessionsCount: number }
    > = {};

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${monthNum}`;
      monthlyMap[key] = {
        month: key,
        monthName: `${monthNames[d.getMonth()]} ${year}`,
        total: 0,
        members: 0,
        visitors: 0,
        sessionsCount: 0,
      };
    }

    // Agregar sesiones a los meses
    activeSessions.forEach((s) => {
      const monthKey = s.date.slice(0, 7);
      if (monthlyMap[monthKey]) {
        monthlyMap[monthKey].sessionsCount += 1;
      }
    });

    // Agregar asistentes a los meses
    records.forEach((r) => {
      const monthKey = r.sessionDate.slice(0, 7);
      if (monthlyMap[monthKey]) {
        monthlyMap[monthKey].total += 1;
        if (r.attendeeType === 'member') {
          monthlyMap[monthKey].members += 1;
        } else {
          monthlyMap[monthKey].visitors += 1;
        }
      }
    });

    const monthlyTrends = Object.values(monthlyMap);

    // Sesiones Recientes
    activeSessions.sort((a, b) => b.date.localeCompare(a.date));
    const recentSessions = activeSessions.slice(0, 5);

    const stats: AttendanceStats = {
      totalSessions,
      totalAttendance,
      membersAttendance,
      visitorsAttendance,
      averagePerSession,
      totalVisitors,
      visitorsWithConsentCount,
      visitorsWithoutConsentCount,
      pendingFollowUpsCount,
      overdueFollowUpsCount,
      completedFollowUpsCount,
      attendanceBySessionType,
      monthlyTrends,
      recentSessions,
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: unknown) {
    console.error('Error al generar estadísticas de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al calcular estadísticas de asistencia.' },
      { status: 500 }
    );
  }
}
