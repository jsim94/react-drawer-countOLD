import { Box, Button, TextField, Typography } from "@mui/material";

import { calcAppState, submitHistory } from "../redux/slices/calculatorApp";
import useTimeout from "../hooks/useTimeout";
import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import Loader from "./Loader";
import { getFields } from "../types/CalcAppTypes";
import { useAppDispatch, useAppSelector } from "../hooks/useApp";

interface AppFormProps {
  setTab: Dispatch<SetStateAction<number>>;
}

type FormState = any;

const AppForm = ({ setTab }: AppFormProps) => {
  const dispatch = useAppDispatch();
  const [form, setForm] = useState<FormState>({});
  const [submitting, setSubmitting] = useState(false);
  const [pristine, setPristine] = useState(false);

  const { schema, total, result } = useAppSelector((state) => ({
    schema: state.calcApp.schema,
    total: state.calcApp.total,
    result: state.calcApp.result,
  }));

  const fields = useMemo(() => getFields(schema!), [schema]);

  // initialize form on schema/result change
  useEffect(() => {
    if (!schema) return;

    setSubmitting(false);

    const totals: any = {};

    if (result) {
      result.values.forEach((val, idx) => {
        totals[val.name] =
          result.depositValues.denominations[idx] +
          result.drawerValues.denominations[idx];
      });
      setPristine(true);
    } else if (pristine) {
      setPristine(false);
      setForm({ ...form });
      return;
    }

    const formData: FormState = {};
    fields.forEach((field) => {
      return (formData[field.name] = !!result ? totals[field.name] : null);
    });

    setForm(formData);
  }, [schema, fields, result]);

  // update total on timeout when form changes
  const { cancelTimeout } = useTimeout(
    form,
    () => {
      dispatch(calcAppState.updateTotal(form));
    },
    500
  );

  // update form values
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (!/^[0-9]{0,5}$/.test(value)) return;

    const newForm: FormState = { ...form };
    newForm[name] = value === "" ? null : +value;
    setForm(newForm);

    if (pristine) {
      handleReset(false);
    }
  };

  // submit form
  const handleSubmit = (e: React.FormEvent<HTMLElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const newForm: any = {};

    fields.forEach((field) => {
      const val = form[field.name];
      newForm[field.name] = val === "" ? 0 : +val;
    });
    cancelTimeout(true);
    setForm(newForm);

    dispatch(submitHistory(newForm));
    setTab(1);
  };

  // reset form
  const handleReset = (resetForm: boolean = true) => {
    if (result) {
      dispatch(calcAppState.resetResult());
    }

    if (!resetForm) return;

    setForm((state: FormState) => {
      const newState: FormState = {};
      Object.keys(state).forEach((field) => {
        newState[field] = null;
      });
      return newState;
    });
  };

  if (!schema) return <Loader />;

  return (
    <form>
      {fields.map((field) => {
        return (
          <TextField
            fullWidth
            key={field.name}
            id={field.name}
            name={field.name}
            label={field.name}
            value={
              form[field.name] === undefined || form[field.name] === null
                ? ""
                : form[field.name].toString()
            }
            onChange={handleChange}
            sx={{ marginBottom: "10px" }}
            autoComplete="off"
            disabled={submitting}
          />
        );
      })}
      <Box mb={5}>
        <Button
          sx={{ marginInlineEnd: "12px" }}
          variant="contained"
          size="large"
          onClick={handleSubmit}
          type="submit"
          disabled={!!result || submitting}
        >
          Submit
        </Button>
        <Typography sx={{ display: "inline" }}>
          Total: {schema.symbol}
          {(total / 100).toFixed(2)}
        </Typography>
        <Button
          variant="contained"
          color="error"
          size="large"
          sx={{ float: "inline-end" }}
          onClick={
            handleReset as unknown as React.MouseEventHandler<HTMLButtonElement>
          }
        >
          Reset
        </Button>
      </Box>
    </form>
  );
};

export default AppForm;
