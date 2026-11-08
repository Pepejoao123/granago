package __PACKAGE__;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.SizeF;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.json.JSONObject;

/**
 * Estado compartilhado dos widgets (SharedPreferences). O app (plugin GranaWidget) envia um JSON já
 * formatado — saldo do mês, gastos de hoje e cartões — e o tema escolhido. Cada widget tem um layout
 * compacto (2x2) e um largo (3x2+) em 3 temas: dark, glass e glasslight.
 */
public class GranaWidgets {

    static final String PREFS = "granago_widget";
    private static final int FLAGS = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static JSONObject data(Context c) {
        try { return new JSONObject(prefs(c).getString("data", "{}")); }
        catch (Exception e) { return new JSONObject(); }
    }

    static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    /* ---------------- tema ---------------- */

    interface Filler { void fill(Context c, RemoteViews v, boolean small); }

    static String theme(Context c) {
        String t = prefs(c).getString("theme", "dark");
        return "glass".equals(t) || "glasslight".equals(t) ? t : "dark";
    }

    /** Cores que mudam em tempo de execução (o resto vem dos layouts gerados por patch-android.js). */
    static int color(Context c, String key) {
        boolean light = "glasslight".equals(theme(c));
        boolean glass = "glass".equals(theme(c));
        switch (key) {
            case "out": return light ? 0xFFDC2626 : glass ? 0xFFFF8A8E : 0xFFFF6B6E;
            case "in": return light ? 0xFF15803D : glass ? 0xFF7CFF7C : 0xFF5CF25C;
            case "muted": return light ? 0x990F1115 : glass ? 0xB3FFFFFF : 0x99FFFFFF;
            default: return light ? 0xFF0F1115 : 0xFFFFFFFF; // ink
        }
    }

    static int parse(String s, int def) {
        try { return Color.parseColor(s); } catch (Exception e) { return def; }
    }

    private static int layout(Context c, String kind, String size) {
        int id = c.getResources().getIdentifier("widget_" + kind + "_" + size + "_" + theme(c), "layout", c.getPackageName());
        return id != 0 ? id : c.getResources().getIdentifier("widget_" + kind + "_" + size + "_dark", "layout", c.getPackageName());
    }

    private static RemoteViews make(Context c, String kind, boolean small, Filler f) {
        RemoteViews v = new RemoteViews(c.getPackageName(), layout(c, kind, small ? "s" : "w"));
        f.fill(c, v, small);
        return v;
    }

    /** Android 12+: o launcher troca sozinho entre compacto e largo ao redimensionar. Antes disso, decide pela largura. */
    static RemoteViews responsive(Context c, AppWidgetManager m, int id, String kind, Filler f) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Map<SizeF, RemoteViews> map = new HashMap<>();
            map.put(new SizeF(100f, 100f), make(c, kind, true, f));
            map.put(new SizeF(200f, 100f), make(c, kind, false, f));
            return new RemoteViews(map);
        }
        int w = 250;
        if (m != null && id != 0) {
            Bundle o = m.getAppWidgetOptions(id);
            if (o != null) w = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250);
        }
        return make(c, kind, w > 0 && w < 200, f);
    }

    /* ---------------- abrir o app com uma ação ---------------- */

    static PendingIntent openApp(Context c) {
        Intent i = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        return i == null ? null : PendingIntent.getActivity(c, 3600, i, FLAGS);
    }

    /** Abre o app com uma ação ("despesa", "msg", "audio", "foto", "card:ID"), entregue ao JS por takePending. */
    static PendingIntent openAction(Context c, String action, int req) {
        Intent i = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        if (i == null) return null;
        i.putExtra("granaAction", action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, req, i, FLAGS);
    }

    /** Chamado pela MainActivity ao abrir pelo widget: guarda a ação para o app executar. */
    static void takeIntent(Context c, Intent i) {
        if (i == null) return;
        String a = i.getStringExtra("granaAction");
        if (a == null || a.isEmpty()) return;
        i.removeExtra("granaAction");
        prefs(c).edit().putString("pendingAction", a).putLong("pendingActionAt", System.currentTimeMillis()).apply();
    }

    static PendingIntent broadcast(Context c, Class<?> cls, String action, int req) {
        Intent i = new Intent(c, cls).setAction(action);
        return PendingIntent.getBroadcast(c, req, i, FLAGS);
    }

    static void click(RemoteViews v, int id, PendingIntent pi) {
        if (pi != null) v.setOnClickPendingIntent(id, pi);
    }

    static void updateAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        if (m == null) return;
        for (int id : m.getAppWidgetIds(new ComponentName(c, MonthWidget.class))) m.updateAppWidget(id, MonthWidget.build(c, m, id));
        for (int id : m.getAppWidgetIds(new ComponentName(c, TodayWidget.class))) m.updateAppWidget(id, TodayWidget.build(c, m, id));
        for (int id : m.getAppWidgetIds(new ComponentName(c, CardWidget.class))) m.updateAppWidget(id, CardWidget.build(c, m, id));
    }
}
