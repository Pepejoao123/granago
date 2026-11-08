package __PACKAGE__;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Widget "Cartão": fatura atual, vencimento, limite usado/disponível com a cor do banco.
 * O botão › passa para o próximo cartão; tocar no widget abre a fatura no app.
 */
public class CardWidget extends AppWidgetProvider {

    static final String ACTION_NEXT = "com.granago.widget.NEXT_CARD";

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c, m, id));
    }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle o) {
        m.updateAppWidget(id, build(c, m, id));
    }

    @Override
    public void onReceive(Context c, Intent i) {
        super.onReceive(c, i);
        if (ACTION_NEXT.equals(i.getAction())) {
            int idx = GranaWidgets.prefs(c).getInt("cardIdx", 0);
            GranaWidgets.prefs(c).edit().putInt("cardIdx", idx + 1).apply();
            GranaWidgets.updateAll(c);
        }
    }

    static RemoteViews build(Context c, AppWidgetManager m, int id) {
        return GranaWidgets.responsive(c, m, id, "card", CardWidget::fill);
    }

    static void fill(Context c, RemoteViews v, boolean small) {
        JSONArray cards = GranaWidgets.data(c).optJSONArray("cards");
        int n = cards == null ? 0 : cards.length();
        if (n == 0) {
            v.setTextViewText(R.id.cd_name, "CARTÃO");
            v.setTextViewText(R.id.cd_inv, "—");
            v.setTextViewText(R.id.cd_due, "Cadastre um cartão no app");
            v.setTextViewText(R.id.cd_avail, "");
            if (!small) v.setTextViewText(R.id.cd_limit, "");
            v.setTextViewText(R.id.cd_logo, "$");
            v.setProgressBar(R.id.cd_bar, 100, 0, false);
            v.setViewVisibility(R.id.cd_next, View.GONE);
            GranaWidgets.click(v, R.id.cd_root, GranaWidgets.openApp(c));
            return;
        }
        int idx = Math.abs(GranaWidgets.prefs(c).getInt("cardIdx", 0)) % n;
        JSONObject o = cards.optJSONObject(idx);
        if (o == null) o = new JSONObject();

        v.setInt(R.id.cd_logo_bg, "setColorFilter", GranaWidgets.parse(o.optString("color"), 0xFF3A3F4B));
        v.setTextViewText(R.id.cd_logo, o.optString("ab", "$"));
        v.setTextColor(R.id.cd_logo, GranaWidgets.parse(o.optString("fg"), 0xFFFFFFFF));
        String name = o.optString("name", "Cartão");
        v.setTextViewText(R.id.cd_name, (small ? name : o.optString("bank", "") + " · " + name).toUpperCase());
        v.setTextViewText(R.id.cd_inv, o.optString("inv", "R$ 0,00"));
        String due = o.optString("invLbl", "") + " · " + o.optString("due", "") + (o.optBoolean("paid", false) ? " · paga ✓" : "");
        v.setTextViewText(R.id.cd_due, small ? o.optString("due", "") : due);
        v.setProgressBar(R.id.cd_bar, 100, Math.max(0, Math.min(100, o.optInt("pct", 0))), false);
        v.setTextViewText(R.id.cd_avail, (small ? "Disp. " : "Disponível ") + o.optString("avail", ""));
        if (!small) v.setTextViewText(R.id.cd_limit, "limite " + o.optString("limit", ""));
        v.setViewVisibility(R.id.cd_next, n > 1 ? View.VISIBLE : View.GONE);

        GranaWidgets.click(v, R.id.cd_next, GranaWidgets.broadcast(c, CardWidget.class, ACTION_NEXT, 3520));
        GranaWidgets.click(v, R.id.cd_root, GranaWidgets.openAction(c, "card:" + o.optString("id", ""), 3521));
    }
}
