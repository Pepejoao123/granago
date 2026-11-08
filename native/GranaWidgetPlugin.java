package __PACKAGE__;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ponte entre o app (JS) e os widgets da tela inicial.
 *  update()      → app envia os números já formatados (JSON em "data") e o tema
 *  takePending() → app recebe a ação pedida por um botão de widget (lançar despesa, áudio, foto, fatura)
 *  evento "widgetAction" → avisa o app já aberto que um widget o chamou
 *  pin()         → pede ao launcher para adicionar o widget à tela inicial
 */
@CapacitorPlugin(name = "GranaWidget")
public class GranaWidgetPlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        Context c = getContext();
        SharedPreferences.Editor e = GranaWidgets.prefs(c).edit();
        String data = call.getString("data");
        if (data != null && !data.isEmpty()) e.putString("data", data);
        String theme = call.getString("theme");
        if (theme != null && !theme.isEmpty()) e.putString("theme", theme);
        e.apply();
        GranaWidgets.updateAll(c);
        call.resolve();
    }

    @PluginMethod
    public void takePending(PluginCall call) {
        SharedPreferences p = GranaWidgets.prefs(getContext());
        JSObject r = new JSObject();
        String action = p.getString("pendingAction", "");
        if (!action.isEmpty() && System.currentTimeMillis() - p.getLong("pendingActionAt", 0) < 120000) r.put("action", action);
        p.edit().remove("pendingAction").apply();
        call.resolve(r);
    }

    @PluginMethod
    public void pin(PluginCall call) {
        Context c = getContext();
        String kind = call.getString("kind", "month");
        Class<?> cls = "today".equals(kind) ? TodayWidget.class : "card".equals(kind) ? CardWidget.class : MonthWidget.class;
        JSObject r = new JSObject();
        boolean ok = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager m = c.getSystemService(AppWidgetManager.class);
            if (m != null && m.isRequestPinAppWidgetSupported()) ok = m.requestPinAppWidget(new ComponentName(c, cls), null, null);
        }
        r.put("ok", ok);
        call.resolve(r);
    }

    /** App já aberto e chamado por um botão de widget (MainActivity guardou a ação). */
    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        notifyListeners("widgetAction", new JSObject());
    }
}
