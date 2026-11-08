package __PACKAGE__;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

/** Widget "Gastos de hoje": total gasto hoje, últimos lançamentos e botões para lançar (manual, mensagem, áudio, foto). */
public class TodayWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c, m, id));
    }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle o) {
        m.updateAppWidget(id, build(c, m, id));
    }

    static RemoteViews build(Context c, AppWidgetManager m, int id) {
        return GranaWidgets.responsive(c, m, id, "today", TodayWidget::fill);
    }

    static void fill(Context c, RemoteViews v, boolean small) {
        JSONObject d = GranaWidgets.data(c);
        boolean fresh = GranaWidgets.today().equals(d.optString("day", "")); // virou o dia e o app não abriu: zera
        int n = fresh ? d.optInt("todayN", 0) : 0;
        v.setTextViewText(R.id.td_value, fresh ? d.optString("today", "R$ 0,00") : "R$ 0,00");
        v.setTextViewText(R.id.td_count, small ? String.valueOf(n) : n == 0 ? "nenhum" : n == 1 ? "1 gasto" : n + " gastos");
        if (!small) {
            JSONArray last = fresh ? d.optJSONArray("last") : null;
            line(v, R.id.td_last1, last, 0, n == 0 ? "Toque em ＋ para lançar o primeiro gasto" : "");
            line(v, R.id.td_last2, last, 1, "");
        }

        GranaWidgets.click(v, R.id.td_root, GranaWidgets.openApp(c));
        GranaWidgets.click(v, R.id.td_add, GranaWidgets.openAction(c, "despesa", 3511));
        GranaWidgets.click(v, R.id.td_audio, GranaWidgets.openAction(c, "audio", 3512));
        GranaWidgets.click(v, R.id.td_photo, GranaWidgets.openAction(c, "foto", 3513));
        if (!small) GranaWidgets.click(v, R.id.td_msg, GranaWidgets.openAction(c, "msg", 3514));
    }

    private static void line(RemoteViews v, int id, JSONArray a, int i, String fallback) {
        String s = a != null && i < a.length() ? a.optString(i, "") : "";
        if (s.isEmpty()) s = fallback;
        v.setTextViewText(id, s);
        v.setViewVisibility(id, s.isEmpty() ? View.GONE : View.VISIBLE);
    }
}
