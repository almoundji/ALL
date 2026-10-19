import 'package:flutter/material.dart';

import '../draft.dart';
import '../i18n.dart';
import '../theme.dart';
import 'common.dart';
import 'payment.dart';

const purposes = ['Tourisme', 'Affaires', 'Visite familiale', 'Conférence', 'Études', 'Transit'];
const ports = {
  'AIBD': 'Aéroport Int. Blaise Diagne',
  'PDK': 'Port Autonome de Dakar',
  'ZIG': 'Aéroport de Ziguinchor',
  'ROS': 'Rosso',
  'KID': 'Kidira',
  'KAR': 'Karang',
};

/// Étape 3 : coordonnées, voyage, santé.
class DetailsScreen extends StatefulWidget {
  const DetailsScreen({super.key});
  @override
  State<DetailsScreen> createState() => _DetailsScreenState();
}

class _DetailsScreenState extends State<DetailsScreen> {
  @override
  void initState() {
    super.initState();
    if (draft.arrival.isEmpty) draft.arrival = _iso(DateTime.now().add(const Duration(days: 7)));
  }

  static String _iso(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Widget _field(String label, String value, void Function(String) set, {TextInputType? type, TextCapitalization cap = TextCapitalization.words}) => TextFormField(
        initialValue: value,
        keyboardType: type,
        textCapitalization: cap,
        decoration: InputDecoration(labelText: label),
        onChanged: (v) => draft.update(() => set(v)),
      );

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(t('stay')), actions: const [LangSwitch()]),
        body: ListenableBuilder(
          listenable: draft,
          builder: (context, _) => ListView(padding: const EdgeInsets.all(20), children: [
            const StepHeader(3),
            Section(title: t('identity'), children: [
              _field(t('surname'), draft.surname, (v) => draft.surname = v),
              _field(t('given'), draft.given, (v) => draft.given = v),
              Row(children: [
                Expanded(child: InfoRow(t('docNo'), draft.docNo)),
              ]),
              InfoRow(t('dob'), draft.dob),
              InfoRow(t('nat'), draft.nat),
              _field(t('email'), draft.email, (v) => draft.email = v.trim(), type: TextInputType.emailAddress, cap: TextCapitalization.none),
              _field(t('phone'), draft.phone, (v) => draft.phone = v.trim(), type: TextInputType.phone, cap: TextCapitalization.none),
            ]),
            Section(title: t('trip'), children: [
              DropdownButtonFormField<String>(
                initialValue: draft.purpose,
                isExpanded: true,
                decoration: InputDecoration(labelText: t('purpose')),
                items: [for (final p in purposes) DropdownMenuItem(value: p, child: Text(tv(p)))],
                onChanged: (v) => draft.update(() => draft.purpose = v ?? draft.purpose),
              ),
              InkWell(
                onTap: () async {
                  final now = DateTime.now();
                  final picked = await showDatePicker(
                    context: context,
                    locale: Locale(lang.value),
                    firstDate: now,
                    lastDate: now.add(const Duration(days: 365)),
                    initialDate: DateTime.tryParse(draft.arrival) ?? now,
                  );
                  if (picked != null) draft.update(() => draft.arrival = _iso(picked));
                },
                child: InputDecorator(decoration: InputDecoration(labelText: t('arrival'), suffixIcon: const Icon(Icons.calendar_today, size: 18)), child: Text(draft.arrival)),
              ),
              Row(children: [
                Expanded(child: Text(t('nights', {'n': draft.nights}))),
                IconButton.outlined(onPressed: draft.nights > 1 ? () => draft.update(() => draft.nights--) : null, icon: const Icon(Icons.remove)),
                const SizedBox(width: 8),
                IconButton.outlined(onPressed: draft.nights < 90 ? () => draft.update(() => draft.nights++) : null, icon: const Icon(Icons.add)),
              ]),
              DropdownButtonFormField<String>(
                initialValue: draft.port,
                isExpanded: true,
                decoration: InputDecoration(labelText: t('port')),
                items: [for (final e in ports.entries) DropdownMenuItem(value: e.key, child: Text(e.value, overflow: TextOverflow.ellipsis))],
                onChanged: (v) => draft.update(() => draft.port = v ?? draft.port),
              ),
              _field(t('address'), draft.address, (v) => draft.address = v, cap: TextCapitalization.sentences),
            ]),
            Section(title: t('health'), children: [
              SwitchListTile(contentPadding: EdgeInsets.zero, title: Text(t('yellowFever')), value: draft.yellowFever, onChanged: (v) => draft.update(() => draft.yellowFever = v)),
              SwitchListTile(contentPadding: EdgeInsets.zero, title: Text(t('symptoms')), value: draft.symptoms, onChanged: (v) => draft.update(() => draft.symptoms = v)),
              _field(t('countries'), draft.countriesVisited, (v) => draft.countriesVisited = v),
            ]),
            FilledButton(onPressed: draft.identityComplete ? () => push(context, const PaymentScreen()) : null, child: Text(t('toPayment'))),
            if (!draft.identityComplete) Padding(padding: const EdgeInsets.only(top: 10), child: Text(t('incomplete'), style: const TextStyle(color: WawColors.warning))),
          ]),
        ),
      );
}
