package __PACKAGE__;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.os.Bundle;
import android.widget.RemoteViews;
import org.json.JSONObject;

/** Widget "Saldo do mês": saldo, receitas, despesas, barra do quanto da receita já foi gasto e atalhos de lançamento. */
public class MonthWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c, m, id));
    }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle o) {
        m.updateAppWidget(id, build(c, m, id)); // redimensionado: troca entre compacto e largo
    }

    static RemoteViews build(Context c, AppWidgetManager m, int id) {
        return GranaWidgets.responsive(c, m, id, "month", MonthWidget::fill);
    }

    static void fill(Context c, RemoteViews v, boolean small) {
        JSONObject d = GranaWidgets.data(c);
        v.setTextViewText(R.id.mo_label, small ? d.optString("monthShort", "SALDO") : d.optString("monthLbl", "SALDO DO MÊS"));
        v.setTextViewText(R.id.mo_bal, d.optString("bal", "R$ 0,00"));
        v.setTextColor(R.id.mo_bal, GranaWidgets.color(c, d.optBoolean("neg", false) ? "out" : "ink"));
        if (small) {
            v.setTextViewText(R.id.mo_in, "↑ " + d.optString("incS", "R$ 0"));
            v.setTextViewText(R.id.mo_out, "↓ " + d.optString("outS", "R$ 0"));
        } else {
            v.setTextViewText(R.id.mo_in, d.optString("inc", "R$ 0,00"));
            v.setTextViewText(R.id.mo_out, d.optString("out", "R$ 0,00"));
        }
        v.setProgressBar(R.id.mo_bar, 100, Math.max(0, Math.min(100, d.optInt("pct", 0))), false);

        GranaWidgets.click(v, R.id.mo_root, GranaWidgets.openApp(c));
        GranaWidgets.click(v, R.id.mo_add, GranaWidgets.openAction(c, "despesa", 3501));
        GranaWidgets.click(v, R.id.mo_audio, GranaWidgets.openAction(c, "audio", 3502));
        if (!small) GranaWidgets.click(v, R.id.mo_photo, GranaWidgets.openAction(c, "foto", 3503));
    }
}
