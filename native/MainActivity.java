package __PACKAGE__;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GranaWidgetPlugin.class);    // widgets da tela inicial (saldo, hoje e cartão)
        GranaWidgets.takeIntent(this, getIntent()); // aberto por um botão de widget
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onNewIntent(Intent intent) {
        GranaWidgets.takeIntent(this, intent); // guarda a ação antes de avisar o app (GranaWidgetPlugin)
        super.onNewIntent(intent);
    }
}
